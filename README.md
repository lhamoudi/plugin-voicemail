<a  href="https://www.twilio.com">
<img  src="https://static0.twilio.com/marketing/bundles/marketing/img/logos/wordmark-red.svg"  alt="Twilio"  width="250"  />
</a>
 
# Voicemail for Flex

NOTE: This is adapted from the plugin from this solution guide: https://www.twilio.com/docs/flex/solutions-library/queued-callback-and-voicemail. All callback functionality has been stripped out, and the option to leave a voicemail can happen at any time during the hold period (by pressing *)

The Voicemail for Flex plugin helps Flex admins automate handling of agent voicemail requests from customers instead of having them wait longer in a queue.

## Set up

### Requirements

To deploy this plugin, you will need:

- An active Twilio account with Flex provisioned. Refer to the [Flex Quickstart](https://www.twilio.com/docs/flex/quickstart/flex-basics#sign-up-for-or-sign-in-to-twilio-and-create-a-new-flex-project) to create one.
- npm version 5.0.0 or later installed (type `npm -v` in your terminal to check)
- Node version 12.21 or later installed (type `node -v` in your terminal to check)
- [Twilio CLI](https://www.twilio.com/docs/twilio-cli/quickstart#install-twilio-cli) along with the [Flex CLI Plugin](https://www.twilio.com/docs/twilio-cli/plugins#available-plugins) and the [Serverless Plugin](https://www.twilio.com/docs/twilio-cli/plugins#available-plugins). Run the following commands to install them:

	```
	# Install the Twilio CLI
	npm install twilio-cli -g
	# Install the Serverless and Flex as Plugins
	twilio plugins:install @twilio/plugin-serverless
	twilio plugins:install @twilio/plugin-flex
	```

- A GitHub account
- [Native Dialpad configured on your Flex instance](https://www.twilio.com/docs/flex/dialpad/enable)

### Twilio Account Settings

Before we begin, we need to collect
all the config values we need to run the application:

| Config&nbsp;Value | Description                                                                                                                                                  |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account&nbsp;Sid  | Your primary Twilio account identifier - find this [in the Console](https://www.twilio.com/console).                                                         |
| Serverless Deployment Domain | The resulting Serverless domain name after deploying your Twilio Functions |
| Workspace SID | Your Flex Task Assignment workspace SID - find this [in the Console TaskRouter Workspaces page](https://www.twilio.com/console/taskrouter/workspaces)

### Local development

After the above requirements have been met:

1. Clone this repository

```
git clone https://github.com/twilio-professional-services/plugin-voicemail.git
```

2. Change into the `public` subdirectory of the repo and run the following:

```
cd plugin-voicemail/public && mv appConfig.example.js appConfig.js
```

3. Install dependencies

```bash
npm install
```

4. [Deploy your Twilio Functions and Assets](#twilio-serverless-deployment)

5. Run the application

```bash
twilio flex:plugins:start
```

See [Twilio Account Settings](#twilio-account-settings) to locate the necessary environment variables.

That's it!

### Twilio Serverless deployment

You need to deploy the functions associated with the Voicemail Flex plugin to your Flex instance. The functions are called from the plugin you will deploy in the next step and integrate with TaskRouter, passing in required attributes to generate the voicemail task, depending on the customer selection in IVR
#### Pre-deployment Steps

1. From the root directory of your copy of the source code, change into `serverless` and rename `.env.example` to `.env`.

```
cd serverless && mv .env.example .env
```

2. Open `.env` with your text editor and modify TWILIO_WORKSPACE_SID with your Flex Task Assignment SID.

```
TWILIO_WORKSPACE_SID=WSxxxxxxxxxxxxxxxxxxxxxx`
```

3. To deploy your Voicemail functions and assets, run the following:

```
$ twilio serverless:deploy --assets

## Example Output
Deploying functions & assets to the Twilio Runtime
Env Variables
⠇ Creating 4 Functions
✔ Serverless project successfully deployed

Deployment Details
Domain: plugin-voicemail-functions-xxxx-dev.twil.io
Service:
  plugin-voicemail-functions 
Functions:
  https://plugin-voicemail-functions-xxxx-dev.twil.io/inqueue-callback
  https://plugin-voicemail-functions-xxxx-dev.twil.io/inqueue-utils  
  https://plugin-voicemail-functions-xxxx-dev.twil.io/queue-menu
  https://plugin-voicemail-functions-xxxx-dev.twil.io/inqueue-voicemail

Assets:
  https://plugin-voicemail-functions-xxxx-dev.twil.io/assets/alertTone.mp3
  https://plugin-voicemail-functions-xxxx-dev.twil.io/assets/guitar_music.mp3
```

_Note:_ Copy and save the domain returned when you deploy a function. You will need it in the next step. If you forget to copy the domain, you can also find it by navigating to [Functions > API](https://www.twilio.com/console/functions/api) in the Twilio Console.

> Debugging Tip: Pass the -l or logging flag to review deployment logs. For example, you can pass `-l debug` to turn on debugging logs.

### Deploy your Flex Plugin 

Once you have deployed the function, it is time to deploy the plugin to your Flex instance.

Run the following commands in the plugin root directory. We will leverage the Twilio CLI to build and deploy the Plugin.

1. Rename `.env.example` to `.env`.
2. Open `.env` with your text editor and modify the `REACT_APP_SERVICE_BASE_URL` property to the Domain name you copied in the previous step. Make sure to prefix it with "https://".
	
	```
	plugin-voicemail $ mv .env.example .env
	
	# .env
	REACT_APP_SERVICE_BASE_URL=https://plugin-voicemail-functions-4135-dev.twil.io
	```

3. When you are ready to deploy the plugin, run the following in a command shell:
	
	```
	plugin-voicemail $ twilio flex:plugins:deploy --major --changelog "Updating to use the latest Twilio CLI Flex plugin" --description "Voicemail"
	``` 

4. To enable the plugin on your contact center, follow the suggested next step on the deployment confirmation. To enable it via the Flex UI, see the [Plugins Dashboard documentation](https://www.twilio.com/docs/flex/developer/plugins/dashboard#stage-plugin-changes).


## Configurations

The serverless implementation can be customized using the file [`options.private.js`](serverless/functions/options.private.js). Options include: 

* `sayOptions`: Attributes for the `<Say>` verb used to prompt the customer. You can read more about these attributes and their values on [TwiML™ Voice: `<Say>`](https://www.twilio.com/docs/voice/twiml/say)
* `holdMusicUrl`: Relative or absolute path to the audio file for hold music (default: `/assets/guitar_music.mp3`). If no domain is provided (i.e. relative path), the serverless domain will be used.
* `VoiceMailTaskPriority`: Priority for the Task generatared by the VoiceMail (default: `50`)
* `VoiceMailAlertTone`: Relative or absolute path to the [ringback tone](https://www.twilio.com/docs/voice/twiml/dial#ringtone) that Twilio will play back to the Agent when calling a customer from a voice mail task (default: `/assets/alertTone.mp3`). If no domain is provided (i.e. relative path), the serverless domain will be used. This is not currently implemented in the Flex plugin, and it's for future usage
* `TimeZone`: Timezone configuration. This is used to report time and date of voicemail (default `America/Los_Angeles`)

## License

[MIT](http://www.opensource.org/licenses/mit-license.html)

## Disclaimer

No warranty expressed or implied. Software is as is.

[twilio]: https://www.twilio.com
