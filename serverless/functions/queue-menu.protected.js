/*
 *Synopsis:  This function provides complete handling of Flex In-Queue Voicemail capabilities to include:
 *    1. request to leave a voicemail with callback to originating ANI
 *
 *Voicemail tasks are created and linked to the originating call (Flex Insights reporting). The flex plugin provides
 *a UI for management of the voicemail request including a re-queueing capability.
 *
 *name: util_inQueueMenuMain
 *path: /queue-menu
 *private: CHECKED
 *
 *Function Methods (mode)
 * - main                 => present menu for in-queue main menu options
 * - mainProcess          => present menu for main menu options (#=>Voicemail)
 * - menuProcess          => process DTMF for redirect to supporting functions (Voicemail)
 *
 *Customization:
 * - Set TTS voice option
 * - Set hold music path to ASSET resource (trimmed 30 seconds source)
 *
 *Install/Config: See documentation
 *
 */
const moment = require('moment');

const optionsPath = Runtime.getFunctions().options.path;
const options = require(optionsPath);

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity, func-names
exports.handler = async function (context, event, callback) {
  const domain = `https://${context.DOMAIN_NAME}`;
  const twiml = new Twilio.twiml.VoiceResponse();

  // Retrieve options
  const { sayOptions, holdMusicUrl } = options;

  // Retrieve event arguments
  const { digits, mode } = event;

  console.log('Digits: ', digits);
  console.log('Mode: ', mode);

  let message = '';

  /*
   *  ==========================
   *  BEGIN:  Main logic
   */
  switch (mode) {
    case 'main':
      if (event.skipGreeting !== 'true') {
        const initGreeting = '...Please wait while we direct your call to the next available specialist...';
        twiml.say(sayOptions, initGreeting);
      }
      message = 'To leave a voicemail, press the star key at anytime... Otherwise, please continue to hold';
      const gather = twiml.gather({
        input: 'dtmf',
        timeout: '2',
        action: `${domain}/queue-menu?mode=mainProcess`,
      });
      gather.say(sayOptions, message);
      gather.play(domain + holdMusicUrl);
      twiml.redirect(`${domain}/queue-menu?mode=main`);
      return callback(null, twiml);
    case 'mainProcess':
      if (event.Digits === '*') {
        //  leave a voicemail
        twiml.redirect(`${domain}/inqueue-voicemail?mode=pre-process`);
        return callback(null, twiml);
      }
      twiml.say(sayOptions, 'I did not understand your selection.');
      twiml.redirect(`${domain}/queue-menu?mode=main&skipGreeting=true`);
      return callback(null, twiml);
    default:
      return callback(500, null);
  }
};
