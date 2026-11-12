<#
  Uploads the infrastructure diagrams to the Confluence pages migrated from
  docs/infrastructure/go-tech-platform and docs/infrastructure/go-tech-components,
  and replaces each "Diagram: ... attach image <file>" note with the image.

  Usage (from the H1 folder):
    powershell -ExecutionPolicy Bypass -File .\tools\upload-diagrams-to-confluence.ps1
    add -DryRun to see what would change without changing anything.

  You need an Atlassian API token: https://id.atlassian.com/manage-profile/security/api-tokens
  The token is only kept in memory for this run.
#>
param(
  [string]$Email = "danilos@petsure.com.au",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Base = "https://petsure.atlassian.net/wiki"
$InfraDir = Join-Path $PSScriptRoot "..\docs\infrastructure" | Resolve-Path
$SearchDirs = @($InfraDir.Path, (Join-Path $InfraDir.Path "go-tech-platform\images"))

# Pages created by the migration (parent pages have no diagrams but are harmless to scan)
$PageIds = @(
  2467692582, 2467364920, 2466971725, 2467856408, 2467430425,             # Infrastructure Deployment children
  2466938943, 2466938963, 2466644004, 2467364940, 2466938983, 2466611233, # Component architecture children
  2467430445, 2467856428, 2466939003, 2466676756, 2467856448
)

$secure = Read-Host "Atlassian API token for $Email" -AsSecureString
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Email):$token"))

$client = New-Object System.Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromMinutes(5)
$client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Basic", $auth)
$client.DefaultRequestHeaders.Add("X-Atlassian-Token", "no-check")
$client.DefaultRequestHeaders.Accept.Add((New-Object System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json")))

function Send([System.Net.Http.HttpRequestMessage]$req) {
  $resp = $client.SendAsync($req).GetAwaiter().GetResult()
  $text = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
  if (-not $resp.IsSuccessStatusCode) { throw "HTTP $([int]$resp.StatusCode) $($req.Method) $($req.RequestUri): $text" }
  return $text
}

function Find-File([string]$name) {
  foreach ($d in $SearchDirs) {
    $p = Join-Path $d $name
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}

function Upload-Attachment([long]$pageId, [string]$path) {
  $name = [IO.Path]::GetFileName($path)
  $mime = if ($name -like "*.jpg" -or $name -like "*.jpeg") { "image/jpeg" } else { "image/png" }
  $form = New-Object System.Net.Http.MultipartFormDataContent
  $file = New-Object System.Net.Http.ByteArrayContent(,[IO.File]::ReadAllBytes($path))
  $file.Headers.ContentType = New-Object System.Net.Http.Headers.MediaTypeHeaderValue($mime)
  $form.Add($file, "file", $name)
  $form.Add((New-Object System.Net.Http.StringContent("true")), "minorEdit")
  # PUT = create or update (re-running the script does not create duplicates)
  $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Put, "$Base/rest/api/content/$pageId/child/attachment")
  $req.Content = $form
  [void](Send $req)
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
$total = 0

foreach ($id in $PageIds) {
  $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Get, "$Base/rest/api/content/$id`?expand=body.storage,version")
  $page = (Send $req) | ConvertFrom-Json
  $body = $page.body.storage.value
  $names = [regex]::Matches($body, 'attach image(?:\s|&nbsp;|&#160;)*<code>([^<]+)</code>') | ForEach-Object { [Net.WebUtility]::HtmlDecode($_.Groups[1].Value) } | Select-Object -Unique
  if (-not $names) { Write-Host "[$id] $($page.title): no diagram notes"; continue }

  Write-Host "[$id] $($page.title): $($names.Count) diagram(s)"
  $newBody = $body
  foreach ($name in $names) {
    $path = Find-File $name
    if (-not $path) { Write-Warning "  file not found locally: $name"; continue }

    $esc = [regex]::Escape([Net.WebUtility]::HtmlEncode($name))
    # The note is stored either as a classic macro or as an ADF extension; match the smallest block holding the file name
    $patterns = @(
      "<ac:structured-macro(?:(?!<ac:structured-macro).)*?attach image(?:\s|&nbsp;|&#160;)*<code>$esc</code>.*?</ac:structured-macro>",
      "<ac:adf-extension>(?:(?!<ac:adf-extension>).)*?attach image(?:\s|&nbsp;|&#160;)*<code>$esc</code>.*?</ac:adf-extension>"
    )
    $fname = [Net.WebUtility]::HtmlEncode($name)
    $img = "<ac:image ac:align=`"center`" ac:layout=`"center`" ac:width=`"900`" ac:alt=`"$fname`"><ri:attachment ri:filename=`"$fname`" /></ac:image>"
    $replaced = $false
    foreach ($pat in $patterns) {
      $rx = New-Object System.Text.RegularExpressions.Regex($pat, [System.Text.RegularExpressions.RegexOptions]::Singleline)
      if ($rx.IsMatch($newBody)) {
        $newBody = $rx.Replace($newBody, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $img })
        $replaced = $true; break
      }
    }
    if (-not $replaced) { Write-Warning "  note block not recognised for $name (image will still be attached)" }

    if ($DryRun) { Write-Host "  would upload $name" }
    else { Upload-Attachment $id $path; Write-Host "  uploaded $name"; $total++ }
  }

  if ($DryRun) { continue }
  if ($newBody -ne $body) {
    $update = @{
      id = "$id"; type = "page"; title = $page.title
      version = @{ number = $page.version.number + 1; message = "Diagrams added" }
      body = @{ storage = @{ value = $newBody; representation = "storage" } }
    } | ConvertTo-Json -Depth 10
    $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Put, "$Base/rest/api/content/$id")
    $req.Content = New-Object System.Net.Http.StringContent($update, $utf8, "application/json")
    [void](Send $req)
    Write-Host "  page updated"
  }
}

$token = $null; $auth = $null
Write-Host "Done. $total attachment(s) uploaded."
