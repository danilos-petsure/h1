-- =====================================================================================
-- UPM (PETSURE_PRD_UPM) - Historical claims where the SAME vet invoice line item
-- (treatment/drug) appears more than once against DIFFERENT diagnoses.
--
-- Model facts this relies on (from the UPM domain model + table catalog):
--   * [Claim Treatments] PK = (Document Type, Claim No_, Animal No_, Invoice Line No_, Line No_).
--     [Diagnoses Line No_] is NOT part of the key - it is a back-reference to the parent
--     [Claim Diagnosis] line. So a "duplicated" item = 2+ treatment rows under the same
--     invoice with the same code, pointing to different diagnosis lines.
--   * There is NO "original vs copy" pointer and NO allocation-percentage column on
--     [Claim Treatments]. What does exist:
--       [Duplicate Treatment Line]       tinyint - NAV's own duplicate-detection flag
--       [Ignore Duplicate Treatmnt Line] tinyint - assessor override of that flag
--       [Duplicated To Claim No_]        nvarchar - copy-to-another-claim lineage
--       [Fixed By Claim No_]             nvarchar - fix-chain lineage
--       [Line Type]                      int (NAV Option, meaning unverified)
--   * [Claim Entries] is the diagnosis x treatment junction (one row per diagnosis line x
--     treatment line, with its own Amount, + [Part Price Warning]). If UPM splits one
--     item across diagnoses, the split lives here - an allocation % can be DERIVED as
--     entry Amount / treatment Amount (section 3).
--
-- Sections (run independently, top to bottom):
--   0. Profiling - are the native flags / Option values actually used?
--   1. Within-invoice duplicates - same claim/invoice line, same code + date,
--      different diagnosis lines (summary + line detail)
--   2. Is the cost duplicated in full or split? (classification inside section 1)
--   3. Junction view - one treatment line allocated to 2+ diagnoses in [Claim Entries]
--   4. Cross-claim variant - same vet invoice (provider + invoice no) re-used on
--      DIFFERENT claims for the same pet with a different diagnosis
--   5. Diagnosis-combination patterns - "treatment code - diag,diag,diag" counts, and a
--      relevance test: when an invoice carries diagnoses D1 + D2 and treatment T, how
--      often is T linked to both? (needs #TreatLines / #DupGroups from section 1)
--   6. Treatment-code propensity - per treatment code, how many lines/items end up
--      duplicated vs total (needs section 1)
--
-- Requires SQL Server 2017+ (STRING_AGG in section 5).
-- PRODUCTION: section 1 scans all of [Claim Treatments]. Narrow @FromDate in section 1
-- (and run off-peak / on a replica) if volume is a concern.
--
-- Assumption: no [Document Type] filter (all document states are scanned, but every
-- grouping includes Document Type so states never mix). Run 0b to see which values exist
-- and add a filter if you only want e.g. posted/finalised claims.
-- =====================================================================================


-- =====================================================================================
-- 0. PROFILING
-- =====================================================================================

-- 0a. Native duplicate flags and lineage columns on treatment lines
SELECT
    t.[Document Type],
    t.[Line Type],
    t.[Treatment Type],
    COUNT(*)                                                                   AS [Lines],
    SUM(CASE WHEN t.[Duplicate Treatment Line] = 1       THEN 1 ELSE 0 END)    AS [Flagged Duplicate],
    SUM(CASE WHEN t.[Ignore Duplicate Treatmnt Line] = 1 THEN 1 ELSE 0 END)    AS [Duplicate Ignored],
    SUM(CASE WHEN t.[Duplicated To Claim No_] <> ''      THEN 1 ELSE 0 END)    AS [Has Duplicated To Claim],
    SUM(CASE WHEN t.[Fixed By Claim No_] <> ''           THEN 1 ELSE 0 END)    AS [Has Fixed By Claim],
    SUM(CASE WHEN t.[Diagnoses Line No_] = 0             THEN 1 ELSE 0 END)    AS [No Diagnosis Link]
FROM [PETSURE_PRD_UPM].[dbo].[PetSure (Australia) Pty Ltd$Claim Treatments] AS t
GROUP BY t.[Document Type], t.[Line Type], t.[Treatment Type]
ORDER BY t.[Document Type], t.[Line Type], t.[Treatment Type];

-- 0b. Document Type values across the claim tree (to decide on a filter)
SELECT 'Claim' AS [Table], [Document Type], COUNT(*) AS [Rows] FROM [PETSURE_PRD_UPM].[dbo].[PetSure (Australia) Pty Ltd$Claim]            GROUP BY [Document Type]
UNION ALL
SELECT 'Claim Treatments',  [Document Type], COUNT(*)          FROM [PETSURE_PRD_UPM].[dbo].[PetSure (Australia) Pty Ltd$Claim Treatments] GROUP BY [Document Type]
UNION ALL
SELECT 'Claim Entries',     [Document Type], COUNT(*)          FROM [PETSURE_PRD_UPM].[dbo].[PetSure (Australia) Pty Ltd$Claim Entries]    GROUP BY [Document Type]
ORDER BY 1, 2;


-- =====================================================================================
-- 1 + 2. WITHIN-INVOICE DUPLICATES (same invoice line, same item, different diagnoses)
-- Match key : Document Type, Claim No_, Animal No_, Invoice Line No_,
--             Treatment_Drug Code, Treatment Date (day)
-- Condition : the key spans 2+ distinct diagnosis lines
-- Description is NOT in the key - [Desc Variants] = 1 tells you the text matches too.
-- =====================================================================================

IF OBJECT_ID('tempdb..#TreatLines') IS NOT NULL DROP TABLE #TreatLines;

DECLARE @FromDate date = '1900-01-01';   -- treatment-date lower bound; narrow for a faster first run

SELECT
    t.[Document Type],
    t.[Claim No_],
    t.[Animal No_],
    t.[Invoice Line No_],
    t.[Line No_]                                         AS [Treatment Line No],
    t.[Diagnoses Line No_]                               AS [Diagnosis Line No],
    t.[Treatment_Drug Code]                              AS [Treatment Code],
    t.[Treatment_Drug Description]                       AS [Treatment Description],
    UPPER(LTRIM(RTRIM(t.[Treatment_Drug Description])))  AS [Treatment Desc Norm],
    CAST(t.[Treatment Date] AS date)                     AS [Treatment Date],
    t.[Quantity],
    t.[Unit Price],
    t.[Amount],
    t.[Assessed Amount],
    t.[Benefit Paid]                                     AS [Benefit Paid (Treatment)],
    t.[Line Type],
    t.[Duplicate Treatment Line],
    t.[Ignore Duplicate Treatmnt Line],
    t.[Duplicated To Claim No_],
    t.[Fixed By Claim No_],
    d.[Diagnoses Code],
    d.[Diagnoses Description],
    d.[Case No_],
    d.[Peril Code],
    d.[Approved]                                         AS [Diagnosis Approved],
    d.[Benefit Paid]                                     AS [Benefit Paid (Diagnosis)]
INTO #TreatLines
FROM [PETSURE_PRD_UPM].[dbo].[PetSure (Australia) Pty Ltd$Claim Treatments] AS t
LEFT JOIN [PETSURE_PRD_UPM].[dbo].[PetSure (Australia) Pty Ltd$Claim Diagnosis] AS d
      ON  d.[Document Type]    = t.[Document Type]
      AND d.[Claim No_]        = t.[Claim No_]
      AND d.[Animal No_]       = t.[Animal No_]
      AND d.[Invoice Line No_] = t.[Invoice Line No_]
      AND d.[Line No_]         = t.[Diagnoses Line No_]
WHERE t.[Treatment_Drug Code] <> ''
  AND t.[Treatment Date] >= @FromDate;

CREATE CLUSTERED INDEX IX_TL ON #TreatLines
    ([Document Type], [Claim No_], [Animal No_], [Invoice Line No_], [Treatment Code], [Treatment Date]);

IF OBJECT_ID('tempdb..#DupGroups') IS NOT NULL DROP TABLE #DupGroups;

SELECT
    tl.[Document Type],
    tl.[Claim No_],
    tl.[Animal No_],
    tl.[Invoice Line No_],
    tl.[Treatment Code],
    tl.[Treatment Date],
    COUNT(*)                                     AS [Treatment Lines],
    COUNT(DISTINCT tl.[Diagnosis Line No])       AS [Diagnosis Lines],
    COUNT(DISTINCT tl.[Diagnoses Code])          AS [Distinct Diagnosis Codes],
    COUNT(DISTINCT tl.[Case No_])                AS [Distinct Cases],
    COUNT(DISTINCT tl.[Treatment Desc Norm])     AS [Desc Variants],
    COUNT(DISTINCT tl.[Amount])                  AS [Amount Variants],
    MIN(tl.[Amount])                             AS [Min Line Amount],
    MAX(tl.[Amount])                             AS [Max Line Amount],
    SUM(tl.[Amount])                             AS [Sum Line Amount],
    SUM(tl.[Assessed Amount])                    AS [Sum Assessed],
    SUM(tl.[Benefit Paid (Treatment)])           AS [Sum Benefit Paid],
    SUM(CASE WHEN tl.[Benefit Paid (Treatment)] > 0 THEN 1 ELSE 0 END)  AS [Lines With Benefit Paid],
    SUM(CAST(tl.[Duplicate Treatment Line] AS int))                     AS [Lines Flagged Duplicate],
    SUM(CAST(tl.[Ignore Duplicate Treatmnt Line] AS int))               AS [Lines Duplicate Ignored],
    -- Section 2: classification
    CASE
        WHEN COUNT(DISTINCT tl.[Amount]) = 1
            THEN 'FULL COPY - each diagnosis carries the full item amount'
        ELSE 'SPLIT/DIFFERENT AMOUNTS - item cost differs per diagnosis'
    END                                          AS [Pattern]
INTO #DupGroups
FROM #TreatLines AS tl
GROUP BY tl.[Document Type], tl.[Claim No_], tl.[Animal No_], tl.[Invoice Line No_],
         tl.[Treatment Code], tl.[Treatment Date]
HAVING COUNT(DISTINCT tl.[Diagnosis Line No]) > 1;

-- 1a. SUMMARY - one row per duplicated invoice item
SELECT
    c.[Full Claim No_],
    c.[Full Policy No_],
    c.[Received Date]                            AS [Claim Date],
    i.[Service Provider No_],
    i.[Invoice No_],
    i.[Total Amount]                             AS [Invoice Total],
    g.*,
    -- full copy that was paid more than once = likely over-payment
    CASE WHEN g.[Amount Variants] = 1 AND g.[Lines With Benefit Paid] > 1
         THEN 1 ELSE 0 END                       AS [Possible Double Payment]
FROM #DupGroups AS g
JOIN [PETSURE_PRD_UPM].[dbo].[PetSure (Australia) Pty Ltd$Claim] AS c
      ON  c.[Document Type] = g.[Document Type]
      AND c.[No_]           = g.[Claim No_]
LEFT JOIN [PETSURE_PRD_UPM].[dbo].[PetSure (Australia) Pty Ltd$Claim Invoices] AS i
      ON  i.[Document Type] = g.[Document Type]
      AND i.[Claim No_]     = g.[Claim No_]
      AND i.[Animal No_]    = g.[Animal No_]
      AND i.[Line No_]      = g.[Invoice Line No_]
WHERE g.[Distinct Diagnosis Codes] > 1          -- drop this line to also see same-code/different-line repeats
ORDER BY c.[Received Date] DESC, g.[Claim No_], g.[Invoice Line No_], g.[Treatment Code];

-- 1b. DETAIL - every treatment line in those groups, side by side with its diagnosis
SELECT
    tl.*,
    g.[Pattern],
    g.[Diagnosis Lines],
    g.[Sum Line Amount]                          AS [Group Sum Amount],
    CAST(100.0 * tl.[Amount] / NULLIF(g.[Sum Line Amount], 0) AS decimal(9,2))
                                                 AS [Share Of Group Amount %]
FROM #TreatLines AS tl
JOIN #DupGroups  AS g
      ON  g.[Document Type]    = tl.[Document Type]
      AND g.[Claim No_]        = tl.[Claim No_]
      AND g.[Animal No_]       = tl.[Animal No_]
      AND g.[Invoice Line No_] = tl.[Invoice Line No_]
      AND g.[Treatment Code]   = tl.[Treatment Code]
      AND g.[Treatment Date]   = tl.[Treatment Date]
WHERE g.[Distinct Diagnosis Codes] > 1
ORDER BY tl.[Claim No_], tl.[Invoice Line No_], tl.[Treatment Code], tl.[Treatment Date], tl.[Diagnosis Line No];

-- 1c. Headline numbers
SELECT
    [Pattern],
    COUNT(*)                                     AS [Duplicated Items],
    COUNT(DISTINCT [Claim No_])                  AS [Claims Affected],
    SUM([Sum Benefit Paid])                      AS [Benefit Paid On These Lines],
    SUM(CASE WHEN [Amount Variants] = 1 AND [Lines With Benefit Paid] > 1 THEN 1 ELSE 0 END)
                                                 AS [Possible Double Payments]
FROM #DupGroups
WHERE [Distinct Diagnosis Codes] > 1
GROUP BY [Pattern];


-- =====================================================================================
-- 3. JUNCTION VIEW - one treatment line linked to 2+ diagnosis lines in [Claim Entries]
-- If UPM allocates part of an item to each diagnosis, it shows up here rather than as
-- copied rows. [Allocation %] is derived (entry Amount / treatment Amount); there is no
-- stored percentage column.
-- =====================================================================================
WITH MultiDiag AS (
    SELECT e.[Document Type], e.[Claim No_], e.[Animal No_], e.[Invoice Line No_], e.[Treatment Line No_]
    FROM [PETSURE_PRD_UPM].[dbo].[PetSure (Australia) Pty Ltd$Claim Entries] AS e
    WHERE e.[Treatment Line No_] <> 0
    GROUP BY e.[Document Type], e.[Claim No_], e.[Animal No_], e.[Invoice Line No_], e.[Treatment Line No_]
    HAVING COUNT(DISTINCT e.[Diagnosis Line No_]) > 1
)
SELECT
    e.[Document Type],
    e.[Claim No_],
    e.[Animal No_],
    e.[Invoice Line No_],
    e.[Treatment Line No_],
    e.[Diagnosis Line No_],
    e.[Diagnoses Code],
    e.[Case No_]                                 AS [Case No (int)],
    e.[Treatment Code],
    e.[Drug Code],
    e.[Quantity]                                 AS [Entry Qty],
    e.[Amount]                                   AS [Entry Amount],
    e.[Part Price Warning],
    t.[Treatment_Drug Description],
    t.[Quantity]                                 AS [Treatment Qty],
    t.[Amount]                                   AS [Treatment Amount],
    t.[Diagnoses Line No_]                       AS [Treatment Home Diagnosis Line],
    CAST(100.0 * e.[Amount] / NULLIF(t.[Amount], 0) AS decimal(9,2)) AS [Allocation %],
    SUM(e.[Amount]) OVER (PARTITION BY e.[Document Type], e.[Claim No_], e.[Animal No_],
                                       e.[Invoice Line No_], e.[Treatment Line No_])
                                                 AS [Sum Entry Amount],
    t.[Benefit Paid]                             AS [Benefit Paid (Treatment)]
FROM MultiDiag AS m
JOIN [PETSURE_PRD_UPM].[dbo].[PetSure (Australia) Pty Ltd$Claim Entries] AS e
      ON  e.[Document Type]      = m.[Document Type]
      AND e.[Claim No_]          = m.[Claim No_]
      AND e.[Animal No_]         = m.[Animal No_]
      AND e.[Invoice Line No_]   = m.[Invoice Line No_]
      AND e.[Treatment Line No_] = m.[Treatment Line No_]
LEFT JOIN [PETSURE_PRD_UPM].[dbo].[PetSure (Australia) Pty Ltd$Claim Treatments] AS t
      ON  t.[Document Type]    = e.[Document Type]
      AND t.[Claim No_]        = e.[Claim No_]
      AND t.[Animal No_]       = e.[Animal No_]
      AND t.[Invoice Line No_] = e.[Invoice Line No_]
      AND t.[Line No_]         = e.[Treatment Line No_]
ORDER BY e.[Claim No_], e.[Invoice Line No_], e.[Treatment Line No_], e.[Diagnosis Line No_];
-- Reading it: [Sum Entry Amount] ~= [Treatment Amount] -> cost is SPLIT across diagnoses;
--             each [Entry Amount] ~= [Treatment Amount] -> cost is DUPLICATED per diagnosis.


-- =====================================================================================
-- 4. CROSS-CLAIM VARIANT - same vet invoice item claimed on DIFFERENT claims for the
-- same pet, with different diagnoses. Fix/duplicate chains (Created from / Fixed By /
-- Duplicated To) are returned, not excluded, so you can tell re-work from real repeats.
-- =====================================================================================
WITH Items AS (
    SELECT
        t.[Document Type], t.[Claim No_], t.[Animal No_], t.[Invoice Line No_], t.[Line No_],
        UPPER(LTRIM(RTRIM(i.[Service Provider No_])))  AS [Provider],
        UPPER(LTRIM(RTRIM(i.[Invoice No_])))           AS [Vet Invoice No],
        t.[Treatment_Drug Code]                        AS [Treatment Code],
        CAST(t.[Treatment Date] AS date)               AS [Treatment Date],
        t.[Amount], t.[Benefit Paid],
        t.[Duplicated To Claim No_], t.[Fixed By Claim No_],
        d.[Diagnoses Code], d.[Case No_]
    FROM [PETSURE_PRD_UPM].[dbo].[PetSure (Australia) Pty Ltd$Claim Treatments] AS t
    JOIN [PETSURE_PRD_UPM].[dbo].[PetSure (Australia) Pty Ltd$Claim Invoices] AS i
          ON  i.[Document Type] = t.[Document Type]
          AND i.[Claim No_]     = t.[Claim No_]
          AND i.[Animal No_]    = t.[Animal No_]
          AND i.[Line No_]      = t.[Invoice Line No_]
    LEFT JOIN [PETSURE_PRD_UPM].[dbo].[PetSure (Australia) Pty Ltd$Claim Diagnosis] AS d
          ON  d.[Document Type]    = t.[Document Type]
          AND d.[Claim No_]        = t.[Claim No_]
          AND d.[Animal No_]       = t.[Animal No_]
          AND d.[Invoice Line No_] = t.[Invoice Line No_]
          AND d.[Line No_]         = t.[Diagnoses Line No_]
    WHERE i.[Invoice No_] <> '' AND t.[Treatment_Drug Code] <> ''
),
Repeats AS (
    SELECT [Animal No_], [Provider], [Vet Invoice No], [Treatment Code], [Treatment Date]
    FROM Items
    GROUP BY [Animal No_], [Provider], [Vet Invoice No], [Treatment Code], [Treatment Date]
    HAVING COUNT(DISTINCT [Claim No_]) > 1
       AND COUNT(DISTINCT [Diagnoses Code]) > 1
)
SELECT
    it.[Animal No_], it.[Provider], it.[Vet Invoice No], it.[Treatment Code], it.[Treatment Date],
    c.[Full Claim No_], c.[Received Date] AS [Claim Date],
    it.[Document Type], it.[Invoice Line No_], it.[Line No_] AS [Treatment Line No],
    it.[Diagnoses Code], it.[Case No_], it.[Amount], it.[Benefit Paid],
    c.[Created as Duplicate], c.[Created from Claim No_], c.[Fixed By Claim No_] AS [Claim Fixed By],
    c.[Duplicate Invoice Number], c.[Claim Cancelled],
    it.[Duplicated To Claim No_], it.[Fixed By Claim No_] AS [Line Fixed By]
FROM Items AS it
JOIN Repeats AS r
      ON  r.[Animal No_]     = it.[Animal No_]
      AND r.[Provider]       = it.[Provider]
      AND r.[Vet Invoice No] = it.[Vet Invoice No]
      AND r.[Treatment Code] = it.[Treatment Code]
      AND r.[Treatment Date] = it.[Treatment Date]
JOIN [PETSURE_PRD_UPM].[dbo].[PetSure (Australia) Pty Ltd$Claim] AS c
      ON  c.[Document Type] = it.[Document Type]
      AND c.[No_]           = it.[Claim No_]
ORDER BY it.[Animal No_], it.[Vet Invoice No], it.[Treatment Code], it.[Treatment Date], c.[Received Date];
