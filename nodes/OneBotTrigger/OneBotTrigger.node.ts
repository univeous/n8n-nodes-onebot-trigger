import { createHmac, timingSafeEqual } from 'crypto';
import type {
	IDataObject,
	IWebhookFunctions,
	IWebhookResponseData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

function normalizeSignature(input: string): string {
	const signature = input.trim().toLowerCase();
	return signature.startsWith('sha1=') ? signature.slice(5) : signature;
}

function safeCompareHex(expectedHex: string, receivedHex: string): boolean {
	const expected = Buffer.from(expectedHex, 'hex');
	const received = Buffer.from(receivedHex, 'hex');

	if (expected.length !== received.length) {
		return false;
	}

	return timingSafeEqual(expected, received);
}

function computeSignature(rawBody: string | Buffer, secret: string): string {
	return createHmac('sha1', secret).update(rawBody).digest('hex');
}

function asString(input: unknown): string {
	if (typeof input === 'string') {
		return input;
	}

	if (typeof input === 'number' || typeof input === 'boolean') {
		return String(input);
	}

	return '';
}

function asNumberOrString(input: unknown): number | string | '' {
	if (typeof input === 'number' || typeof input === 'string') {
		return input;
	}

	if (typeof input === 'boolean') {
		return input ? 'true' : 'false';
	}

	return '';
}

function parseCsv(input: string): string[] {
	return input
		.split(',')
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

function matchesExactFilter(filterValue: string, actualValue: unknown): boolean {
	if (!filterValue.trim()) {
		return true;
	}
	return asString(actualValue) === filterValue;
}

function matchesIdFilter(filterValue: string, actualValue: unknown): boolean {
	if (!filterValue.trim()) {
		return true;
	}

	const acceptedValues = parseCsv(filterValue);
	const actual = asNumberOrString(actualValue);
	const actualAsString = typeof actual === 'number' ? String(actual) : actual;

	if (!actualAsString) {
		return false;
	}

	return acceptedValues.includes(actualAsString);
}

function getStringParameterSafe(context: IWebhookFunctions, name: string): string {
	try {
		return String(context.getNodeParameter(name) ?? '').trim();
	} catch {
		return '';
	}
}

function getBooleanParameterSafe(context: IWebhookFunctions, name: string): boolean {
	try {
		return context.getNodeParameter(name) === true;
	} catch {
		return false;
	}
}

export class OneBotTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OneBot Trigger',
		name: 'oneBotTrigger',
		icon: 'file:onebot.png',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["eventType"] || "all"}}',
		description: 'Receive OneBot webhook events and verify HMAC-SHA1 signature',
		defaults: {
			name: 'OneBot Trigger',
		},
		credentials: [
			{
				name: 'oneBotWebhookApi',
				required: false,
			},
		],
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: '={{$parameter["httpMethod"]}}',
				responseMode: 'onReceived',
				path: '={{$parameter["path"]}}',
			},
		],
		properties: [
			{
				displayName: 'HTTP Method',
				name: 'httpMethod',
				type: 'options',
				options: [
					{ name: 'POST', value: 'POST' },
					{ name: 'GET', value: 'GET' },
					{ name: 'PUT', value: 'PUT' },
					{ name: 'PATCH', value: 'PATCH' },
					{ name: 'DELETE', value: 'DELETE' },
				],
				default: 'POST',
				description: 'HTTP method for this trigger webhook',
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: 'onebot',
				description: 'Webhook path suffix. Example: onebot -> /webhook/onebot',
			},
			{
				displayName: 'Event Type',
				name: 'eventType',
				type: 'options',
				options: [
					{ name: 'All', value: '' },
					{ name: 'Message', value: 'message' },
					{ name: 'Notice', value: 'notice' },
					{ name: 'Request', value: 'request' },
					{ name: 'Meta', value: 'meta' },
				],
				default: '',
				description: 'Filter post_type; set All to pass all events',
			},
			{
				displayName: 'Message Type',
				name: 'messageType',
				type: 'options',
				displayOptions: {
					show: {
						eventType: ['message'],
					},
				},
				options: [
					{ name: 'All', value: '' },
					{ name: 'Private', value: 'private' },
					{ name: 'Group', value: 'group' },
				],
				default: '',
				description: 'Filter message_type; set All to pass all',
			},
			{
				displayName: 'Notice Type',
				name: 'noticeType',
				type: 'options',
				displayOptions: {
					show: {
						eventType: ['notice'],
					},
				},
				options: [
					{ name: 'All', value: '' },
					{ name: 'Notify', value: 'notify' },
					{ name: 'Group Upload', value: 'group_upload' },
					{ name: 'Group Admin', value: 'group_admin' },
					{ name: 'Group Decrease', value: 'group_decrease' },
					{ name: 'Group Increase', value: 'group_increase' },
					{ name: 'Group Ban', value: 'group_ban' },
					{ name: 'Friend Add', value: 'friend_add' },
					{ name: 'Group Recall', value: 'group_recall' },
					{ name: 'Friend Recall', value: 'friend_recall' },
				],
				default: '',
				description: 'Filter notice_type; set All to pass all',
			},
			{
				displayName: 'Request Type',
				name: 'requestType',
				type: 'options',
				displayOptions: {
					show: {
						eventType: ['request'],
					},
				},
				options: [
					{ name: 'All', value: '' },
					{ name: 'Friend', value: 'friend' },
					{ name: 'Group', value: 'group' },
				],
				default: '',
				description: 'Filter request_type; set All to pass all',
			},
			{
				displayName: 'Message Sub Type',
				name: 'messageSubType',
				type: 'options',
				displayOptions: {
					show: {
						eventType: ['message'],
					},
				},
				options: [
					{ name: 'All', value: '' },
					{ name: 'Friend', value: 'friend' },
					{ name: 'Normal', value: 'normal' },
					{ name: 'Anonymous', value: 'anonymous' },
					{ name: 'Notice', value: 'notice' },
				],
				default: '',
				description: 'Filter message sub_type; set All to pass all',
			},
			{
				displayName: 'Notice Sub Type',
				name: 'noticeSubType',
				type: 'options',
				displayOptions: {
					show: {
						eventType: ['notice'],
					},
				},
				options: [
					{ name: 'All', value: '' },
					{ name: 'Poke', value: 'poke' },
					{ name: 'Lucky King', value: 'lucky_king' },
					{ name: 'Honor', value: 'honor' },
					{ name: 'Leave', value: 'leave' },
					{ name: 'Kick', value: 'kick' },
					{ name: 'Kick Me', value: 'kick_me' },
				],
				default: '',
				description: 'Filter notice sub_type; set All to pass all',
			},
			{
				displayName: 'Request Sub Type',
				name: 'requestSubType',
				type: 'options',
				displayOptions: {
					show: {
						eventType: ['request'],
					},
				},
				options: [
					{ name: 'All', value: '' },
					{ name: 'Add', value: 'add' },
					{ name: 'Invite', value: 'invite' },
				],
				default: '',
				description: 'Filter request sub_type; set All to pass all',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				placeholder: '123456, 234567',
				description: 'Primary filter for user_id; comma-separated values, leave empty to pass all',
			},
			{
				displayName: 'Group ID',
				name: 'groupId',
				type: 'string',
				default: '',
				placeholder: '10001, 10002',
				description: 'Primary filter for group_id; comma-separated values, leave empty to pass all',
			},
			{
				displayName: 'Self ID',
				name: 'selfId',
				type: 'string',
				default: '',
				placeholder: '987654',
				description: 'Optional filter for self_id; comma-separated values, leave empty to pass all',
			},
			{
				displayName: 'Target ID',
				name: 'targetId',
				type: 'string',
				default: '',
				placeholder: '111222',
				description: 'Optional filter for target_id; comma-separated values, leave empty to pass all',
			},
			{
				displayName: 'Strict Invalid Signature Response',
				name: 'strictInvalidSignatureResponse',
				type: 'boolean',
				default: false,
				description:
					'When enabled and Secret is set, invalid signatures return HTTP 401 with an empty response body',
			},
			{
				displayName: 'Emit Skipped Item On Filter Mismatch',
				name: 'emitSkippedOnMismatch',
				type: 'boolean',
				default: false,
				description:
					'When enabled, events that do not match filters are forwarded with skipped=true; when disabled, they are acknowledged and dropped',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		let secret = '';
		try {
			const credentials = await this.getCredentials('oneBotWebhookApi');
			secret = ((credentials.secret as string) || '').trim();
		} catch {
			secret = '';
		}
		const eventTypeFilter = getStringParameterSafe(this, 'eventType');
		const userIdFilter = getStringParameterSafe(this, 'userId');
		const groupIdFilter = getStringParameterSafe(this, 'groupId');
		const messageTypeFilter = getStringParameterSafe(this, 'messageType');
		const noticeTypeFilter = getStringParameterSafe(this, 'noticeType');
		const requestTypeFilter = getStringParameterSafe(this, 'requestType');
		const messageSubTypeFilter = getStringParameterSafe(this, 'messageSubType');
		const noticeSubTypeFilter = getStringParameterSafe(this, 'noticeSubType');
		const requestSubTypeFilter = getStringParameterSafe(this, 'requestSubType');
		const subTypeFilter =
			eventTypeFilter === 'message'
				? messageSubTypeFilter
				: eventTypeFilter === 'notice'
					? noticeSubTypeFilter
					: eventTypeFilter === 'request'
						? requestSubTypeFilter
						: '';
		const selfIdFilter = getStringParameterSafe(this, 'selfId');
		const targetIdFilter = getStringParameterSafe(this, 'targetId');
		const strictInvalidSignatureResponse = getBooleanParameterSafe(
			this,
			'strictInvalidSignatureResponse',
		);
		const emitSkippedOnMismatch = getBooleanParameterSafe(this, 'emitSkippedOnMismatch');

		const req = this.getRequestObject();
		if (secret) {
			const headers = req.headers ?? {};
			const signatureHeader = headers['x-signature'];
			const signatureRaw = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

			if (typeof signatureRaw !== 'string' || signatureRaw.trim().length === 0) {
				return {
					webhookResponse: {
						status: 401,
						body: {
							error: 'Missing signature header',
						},
					},
				};
			}

			const rawBody = (req as { rawBody?: Buffer | string }).rawBody;

			if (rawBody === undefined) {
				return {
					webhookResponse: {
						status: 400,
						body: {
							error: 'Raw body is not available; enable raw request body in n8n',
						},
					},
				};
			}

			const expectedHex = computeSignature(rawBody, secret);
			const receivedHex = normalizeSignature(signatureRaw);
			const isValid = /^[0-9a-f]+$/i.test(receivedHex) && safeCompareHex(expectedHex, receivedHex);

			if (!isValid) {
				if (strictInvalidSignatureResponse) {
					return {
						webhookResponse: {
							status: 401,
							body: '',
						},
					};
				}

				return {
					webhookResponse: {
						status: 401,
						body: {
							error: 'Invalid signature',
						},
					},
				};
			}
		}

		const payload = (req.body ?? {}) as IDataObject;
		const postType = (payload as Record<string, unknown>).post_type;
		const messageType = (payload as Record<string, unknown>).message_type;
		const noticeType = (payload as Record<string, unknown>).notice_type;
		const requestType = (payload as Record<string, unknown>).request_type;
		const subType = (payload as Record<string, unknown>).sub_type;
		const userId = (payload as Record<string, unknown>).user_id;
		const groupId = (payload as Record<string, unknown>).group_id;
		const selfId = (payload as Record<string, unknown>).self_id;
		const targetId = (payload as Record<string, unknown>).target_id;
		const safePostType =
			typeof postType === 'string' || typeof postType === 'number' || typeof postType === 'boolean'
				? postType
				: String(postType ?? '');

		const mismatchReasons: IDataObject = {};
		if (!matchesExactFilter(eventTypeFilter, postType)) mismatchReasons.eventType = true;
		if (!matchesExactFilter(messageTypeFilter, messageType)) mismatchReasons.messageType = true;
		if (!matchesExactFilter(noticeTypeFilter, noticeType)) mismatchReasons.noticeType = true;
		if (!matchesExactFilter(requestTypeFilter, requestType)) mismatchReasons.requestType = true;
		if (!matchesExactFilter(subTypeFilter, subType)) mismatchReasons.subType = true;
		if (!matchesIdFilter(userIdFilter, userId)) mismatchReasons.userId = true;
		if (!matchesIdFilter(groupIdFilter, groupId)) mismatchReasons.groupId = true;
		if (!matchesIdFilter(selfIdFilter, selfId)) mismatchReasons.selfId = true;
		if (!matchesIdFilter(targetIdFilter, targetId)) mismatchReasons.targetId = true;

		const oneBotCommon: IDataObject = {
			postType: asString((payload as Record<string, unknown>).post_type),
			messageType: asString((payload as Record<string, unknown>).message_type),
			subType: asString((payload as Record<string, unknown>).sub_type),
			noticeType: asString((payload as Record<string, unknown>).notice_type),
			requestType: asString((payload as Record<string, unknown>).request_type),
			userId: asNumberOrString((payload as Record<string, unknown>).user_id),
			groupId: asNumberOrString((payload as Record<string, unknown>).group_id),
			selfId: asNumberOrString((payload as Record<string, unknown>).self_id),
			targetId: asNumberOrString((payload as Record<string, unknown>).target_id),
		};

		const output: IDataObject = {
			...payload,
			onebot: oneBotCommon,
		};
		if (Object.keys(mismatchReasons).length > 0) {
			if (emitSkippedOnMismatch) {
				return {
					workflowData: [
						[
							{
								json: {
									...output,
									skipped: true,
									reason: 'filter_mismatch',
									filters: {
										eventType: eventTypeFilter,
										messageType: messageTypeFilter,
										noticeType: noticeTypeFilter,
										requestType: requestTypeFilter,
										subType: subTypeFilter,
										userId: userIdFilter,
										groupId: groupIdFilter,
										selfId: selfIdFilter,
										targetId: targetIdFilter,
									},
									mismatch: mismatchReasons,
									postType: safePostType,
								},
							},
						],
					],
					webhookResponse: {
						status: 200,
						body: {
							ok: true,
							skipped: true,
							reason: 'filter_mismatch',
							postType: safePostType,
							mismatch: mismatchReasons,
						},
					},
				};
			}

			return {
				webhookResponse: {
					status: 200,
					body: {
						ok: true,
						skipped: true,
						reason: 'filter_mismatch',
						postType: safePostType,
						mismatch: mismatchReasons,
					},
				},
			};
		}

		return {
			workflowData: [
				[
					{
						json: output,
					},
				],
			],
			webhookResponse: {
				status: 200,
				body: {
					ok: true,
				},
			},
		};
	}
}
