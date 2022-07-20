/*
 *Synopsis:  This function provides complete handling of Flex In-Queue Voicemail capabilities to include:
 *    1. request to leave a voicemail
 *
 *Voicemail tasks are created and linked to the originating call (Flex Insights reporting). The flex plugin provides
 *a UI for management of the voicemail request including a re-queueing capability.
 *
 *name: util_InQueueVoicemailMenu
 *path: /inqueue-voicemail
 *private: CHECKED
 *
 *Function Methods (mode)
 * - pre-process          => main entry point for queue-back voicemail flow (redirect call, getTask, cancel Task)
 * - main                 => process main menu DTMF selection
 * - success              => menu initiating new number capture
 * - submitVoicemail      => create voicemail task
 *
 *Customization:
 * - Set TTS voice option
 * - Set timezone configuration ( server_tz )
 *
 *Install/Config: See documentation
 *
 *Last Updated: 03/27/2020
 */

const helpersPath = Runtime.getFunctions().helpers.path;
const { getTask, cancelTask, getTime, handleError } = require(helpersPath);
const optionsPath = Runtime.getFunctions().options.path;
const options = require(optionsPath);

// create the voicemail task
async function createVoicemailTask(event, client, taskInfo, workflowSid, ringback) {
  const time = getTime(options.TimeZone);

  const originalTaskAttributes = JSON.parse(taskInfo.data.attributes);

  const taskAttributes = {
    /*
     * THIS IS WHERE YOU WOULD APPLY ANY ATTRIBUTES YOU WANT TO RETAIN FROM ORIGINAL CALL TASK
     */
    /*
     * e.g:
     *
     * region: originalTaskAttributes.region,
     * office: originalTaskAttributes.office,
     * callType: originalTaskAttributes.callType,
     */
    taskType: 'voicemail',
    ringback,
    to: event.Caller, // Inbound caller
    direction: 'inbound',
    name: `Voicemail: ${event.Caller}`,
    from: event.Called, // Twilio Number
    recordingUrl: event.RecordingUrl,
    recordingSid: event.RecordingSid,
    transcriptionSid: event.TranscriptionSid,
    transcriptionText: event.TranscriptionStatus === 'completed' ? event.TranscriptionText : 'Transcription failed',
    callTime: time,
    queueTargetName: taskInfo.taskQueueName,
    queueTargetSid: taskInfo.taskQueueSid,
    workflowTargetSid: taskInfo.workflowSid,
    // eslint-disable-next-line camelcase
    ui_plugin: {
      vmCallButtonAccessibility: false,
      vmRecordButtonAccessibility: true,
    },
  };

  try {
    await client.taskrouter.workspaces(taskInfo.workspaceSid).tasks.create({
      attributes: JSON.stringify(taskAttributes),
      type: 'voicemail',
      taskChannel: 'voicemail',
      priority: options.VoiceMailTaskPriority,
      workflowSid,
    });
  } catch (error) {
    console.log('createVoicemailTask Error');
    handleError(error);
  }
}

exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();
  const twiml = new Twilio.twiml.VoiceResponse();
  const domain = `https://${context.DOMAIN_NAME}`;

  // Retrieve event arguments
  const { digits, mode, CallSid } = event;

  console.log('Digits: ', digits);
  console.log('Mode: ', mode);

  // Load options
  const { sayOptions, VoiceMailAlertTone } = options;

  let task = null;

  switch (mode) {
    //  initial logic to cancel the task and prepare the call for Recording
    case 'pre-process':
      //  Get taskSid based on CallSid
      task = await getTask(context, CallSid);
      const { taskSid } = task;

      // Redirect Call to Voicemail main menu
      const redirectUrl = `${domain}/inqueue-voicemail?mode=main`;
      try {
        await client.calls(CallSid).update({ method: 'POST', url: redirectUrl });
      } catch (error) {
        console.log('updateCall Error');
        handleError(error);
      }

      //  Cancel (update) the task given taskSid
      await cancelTask(client, context.TWILIO_WORKSPACE_SID, taskSid);

      return callback(null, '');

    case 'main':
      //  Main logic for Recording the voicemail
      twiml.say(sayOptions, 'Please leave a message at the tone.  Press the star key when finished.');
      twiml.record({
        action: `${domain}/inqueue-voicemail?mode=success&CallSid=${CallSid}`,
        transcribeCallback: `${domain}/inqueue-voicemail?mode=submitVoicemail&CallSid=${CallSid}`,
        method: 'GET',
        playBeep: 'true',
        transcribe: true,
        timeout: 10,
        finishOnKey: '*',
      });
      twiml.say(sayOptions, 'I did not capture your recording');
      return callback(null, twiml);

    //  End the voicemail interaction - hang up call
    case 'success':
      twiml.say(sayOptions, 'Your voicemail has been successfully received... goodbye');
      twiml.hangup();
      return callback(null, twiml);

    /*
     *  handler to submit the voicemail
     *  create the task here
     */
    case 'submitVoicemail':
      task = await getTask(context, CallSid);
      // TODO: handle error in getTask

      //  create the Voicemail task
      const ringBackUrl = VoiceMailAlertTone.startsWith('https://') ? VoiceMailAlertTone : domain + VoiceMailAlertTone;
      await createVoicemailTask(event, client, task, context.VOICEMAIL_WORKFLOW_SID, ringBackUrl);
      return callback(null, '');
    default:
      return callback(500, 'Mode not specified');
  }
};
