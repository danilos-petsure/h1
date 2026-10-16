This solution solve the following problems I presented yesterday:
Decoupling Clawdia UPM
Simplification Clapi Dapi
Replace Polling between COS and VethHub
Duplicated Service provider id ( It turned out that I don't have yet a clear enough picture about this, so this solution is only touched and not resolved)
The high-level solution is Clawdia starting as soon as a new conversation is submitted.
VetHub publishes business events into Azure Service Bus
VetHub understand the Routing context of the claim at the very beginning so now VetHub is aware of each COS is used for the claim
VetHub publishes the following events so far:
Conversation Initiated
Insurer Routing Context Calculated
Conversation Submission Completed
COS polling into VetHub is removed
An Azure Function will react to Conversation Submission Completed and will call a new Api in COS to Start the Claim from the conversation
This new COS api has the Routing context in the input and know which CSP.Au.DigitalApi (DAPI) and UPM Dynamics Api to call, so  the following operations can be decommissioned:
Clapi
Claim Submission
Finish Claim Submission
Dynamic Clapi
Lodge Claim
An Azure Function reacts onConversationInitiated and starts an new workflow instance in Clawdia
Clawdia saves in a repository the correlation (conversationId to WorkflowInstanceId)

Once COS receives the request, it generate a Claims Reference Number (CRN) and it publish an event
Claim Initiated In COS.  An Azure Function reacts to this event and from the conversation Id searches in the correlations repo the right workflow Id and add a correlation between the CRN and workflow Id (this step might not be required)

During the Claim Submission Saga, COS is also calling the Worksflow Logic App. Potentially, it could call make the same call that is currently done by UPM via Dynamic Clapi (Claw Init Api).
Clawdia is now starting earlier and, most likely, finish the medical assessment even before UPM needs the . (In theory, it could start even earlier)
Clawdia awaits for the Call from UPM before to call the write api as it is now.

As a result: The assessment time takes less time, we remove the polling, got rid of extra api calls, introduced event-driven architecture, and prepare the platform for bigger changes in the future (hopefully next future)

So... What's next?
First of all, if anything I said above doesn't sound right, it is a good time to say
I'm going to provide a slick and shining component architecture with these changes, hopefully tomorrow
If you have time to review the document, will be good
If we are all aligned, we could start to discuss the next group of changes 