import { VERSION } from '@twilio/flex-ui';
import { FlexPlugin } from '@twilio/flex-plugin';
import React from 'react';
import VoicemailIcon from '@material-ui/icons/Voicemail';

import { logger } from './helpers';
import reducers, { namespace } from './states';
import { VoicemailComponent } from './components';

const PLUGIN_NAME = 'InQueueMessagingPlugin';

export default class InQueueMessagingPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { import('@twilio/flex-ui').Manager }
   */
  async init(flex, manager) {
    this.registerReducers(manager);

    this.registerVoicemailChannel(flex, manager);
  }

  /**
   * Registers the {@link VoicemailComponent}
   */
  registerVoicemailChannel(flex, manager) {
    const VoiceMailChannel = flex.DefaultTaskChannels.createDefaultTaskChannel(
      'voicemail',
      (task) => task.taskChannelUniqueName === 'voicemail',
      'VoicemailIcon',
      'VoicemailIcon',
      'deepskyblue',
    );
    // Basic Voicemail Channel Settings
    VoiceMailChannel.templates.TaskListItem.firstLine = (task) => `${task.queueName}: ${task.attributes.name}`;
    VoiceMailChannel.templates.TaskCanvasHeader.title = (task) => `${task.queueName}: ${task.attributes.name}`;
    VoiceMailChannel.templates.IncomingTaskCanvas.firstLine = (task) => task.queueName;
    // Lead Channel Icon
    VoiceMailChannel.icons.active = <VoicemailIcon key="active-voicemail-icon" />;
    VoiceMailChannel.icons.list = <VoicemailIcon key="list-voicemail-icon" />;
    VoiceMailChannel.icons.main = <VoicemailIcon key="main-voicemail-icon" />;
    // Register Lead Channel
    flex.TaskChannels.register(VoiceMailChannel);

    flex.TaskInfoPanel.Content.replace(<VoicemailComponent key="demo-component" manager={manager} />, {
      sortOrder: -1,
      if: (props) => props.task.attributes.taskType === 'voicemail',
    });
  }

  /**
   * Registers the plugin reducers
   *
   * @param manager { Flex.Manager }
   */
  registerReducers(manager) {
    if (!manager.store.addReducer) {
      // eslint: disable-next-line
      console.error(`You need FlexUI > 1.9.0 to use built-in redux; you are currently on ${VERSION}`);
      return;
    }

    //  add the reducers to the manager store
    manager.store.addReducer(namespace, reducers);
  }
}
