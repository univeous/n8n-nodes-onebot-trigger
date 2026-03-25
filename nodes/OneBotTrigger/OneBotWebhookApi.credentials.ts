import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class OneBotWebhookApi implements ICredentialType {
	name = 'oneBotWebhookApi';
	displayName = 'OneBot Webhook API';
	documentationUrl = 'https://onebot.dev/';
	properties: INodeProperties[] = [
		{
			displayName: 'Secret',
			name: 'secret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: false,
			description: 'Shared secret used to verify x-signature (HMAC-SHA1)',
		},
	];
}
