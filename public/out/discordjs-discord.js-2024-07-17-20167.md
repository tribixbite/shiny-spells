# packages\builders\src\components\ActionRow.ts

```ts
/* eslint-disable jsdoc/check-param-names */

import {
	type APIActionRowComponent,
	ComponentType,
	type APIMessageActionRowComponent,
	type APIModalActionRowComponent,
	type APIActionRowComponentTypes,
} from 'discord-api-types/v10';
import { normalizeArray, type RestOrArray } from '../util/normalizeArray.js';
import { ComponentBuilder } from './Component.js';
import { createComponentBuilder } from './Components.js';
import type { ButtonBuilder } from './button/Button.js';
import type { ChannelSelectMenuBuilder } from './selectMenu/ChannelSelectMenu.js';
import type { MentionableSelectMenuBuilder } from './selectMenu/MentionableSelectMenu.js';
import type { RoleSelectMenuBuilder } from './selectMenu/RoleSelectMenu.js';
import type { StringSelectMenuBuilder } from './selectMenu/StringSelectMenu.js';
import type { UserSelectMenuBuilder } from './selectMenu/UserSelectMenu.js';
import type { TextInputBuilder } from './textInput/TextInput.js';

/**
 * The builders that may be used for messages.
 */
export type MessageComponentBuilder =
	| ActionRowBuilder<MessageActionRowComponentBuilder>
	| MessageActionRowComponentBuilder;

/**
 * The builders that may be used for modals.
 */
export type ModalComponentBuilder = ActionRowBuilder<ModalActionRowComponentBuilder> | ModalActionRowComponentBuilder;

/**
 * The builders that may be used within an action row for messages.
 */
export type MessageActionRowComponentBuilder =
	| ButtonBuilder
	| ChannelSelectMenuBuilder
	| MentionableSelectMenuBuilder
	| RoleSelectMenuBuilder
	| StringSelectMenuBuilder
	| UserSelectMenuBuilder;

/**
 * The builders that may be used within an action row for modals.
 */
export type ModalActionRowComponentBuilder = TextInputBuilder;

/**
 * Any builder.
 */
export type AnyComponentBuilder = MessageActionRowComponentBuilder | ModalActionRowComponentBuilder;

/**
 * A builder that creates API-compatible JSON data for action rows.
 *
 * @typeParam ComponentType - The types of components this action row holds
 */
export class ActionRowBuilder<ComponentType extends AnyComponentBuilder> extends ComponentBuilder<
	APIActionRowComponent<APIMessageActionRowComponent | APIModalActionRowComponent>
> {
	/**
	 * The components within this action row.
	 */
	public readonly components: ComponentType[];

	/**
	 * Creates a new action row from API data.
	 *
	 * @param data - The API data to create this action row with
	 * @example
	 * Creating an action row from an API data object:
	 * ```ts
	 * const actionRow = new ActionRowBuilder({
	 * 	components: [
	 * 		{
	 * 			custom_id: "custom id",
	 * 			label: "Type something",
	 * 			style: TextInputStyle.Short,
	 * 			type: ComponentType.TextInput,
	 * 		},
	 * 	],
	 * });
	 * ```
	 * @example
	 * Creating an action row using setters and API data:
	 * ```ts
	 * const actionRow = new ActionRowBuilder({
	 * 	components: [
	 * 		{
	 * 			custom_id: "custom id",
	 * 			label: "Click me",
	 * 			style: ButtonStyle.Primary,
	 * 			type: ComponentType.Button,
	 * 		},
	 * 	],
	 * })
	 * 	.addComponents(button2, button3);
	 * ```
	 */
	public constructor({ components, ...data }: Partial<APIActionRowComponent<APIActionRowComponentTypes>> = {}) {
		super({ type: ComponentType.ActionRow, ...data });
		this.components = (components?.map((component) => createComponentBuilder(component)) ?? []) as ComponentType[];
	}

	/**
	 * Adds components to this action row.
	 *
	 * @param components - The components to add
	 */
	public addComponents(...components: RestOrArray<ComponentType>) {
		this.components.push(...normalizeArray(components));
		return this;
	}

	/**
	 * Sets components for this action row.
	 *
	 * @param components - The components to set
	 */
	public setComponents(...components: RestOrArray<ComponentType>) {
		this.components.splice(0, this.components.length, ...normalizeArray(components));
		return this;
	}

	/**
	 * {@inheritDoc ComponentBuilder.toJSON}
	 */
	public toJSON(): APIActionRowComponent<ReturnType<ComponentType['toJSON']>> {
		return {
			...this.data,
			components: this.components.map((component) => component.toJSON()),
		} as APIActionRowComponent<ReturnType<ComponentType['toJSON']>>;
	}
}

```

# packages\builders\src\components\Assertions.ts

```ts
import { s } from '@sapphire/shapeshift';
import { ButtonStyle, ChannelType, type APIMessageComponentEmoji } from 'discord-api-types/v10';
import { isValidationEnabled } from '../util/validation.js';
import { StringSelectMenuOptionBuilder } from './selectMenu/StringSelectMenuOption.js';

export const customIdValidator = s.string
	.lengthGreaterThanOrEqual(1)
	.lengthLessThanOrEqual(100)
	.setValidationEnabled(isValidationEnabled);

export const emojiValidator = s
	.object({
		id: s.string,
		name: s.string,
		animated: s.boolean,
	})
	.partial.strict.setValidationEnabled(isValidationEnabled);

export const disabledValidator = s.boolean;

export const buttonLabelValidator = s.string
	.lengthGreaterThanOrEqual(1)
	.lengthLessThanOrEqual(80)
	.setValidationEnabled(isValidationEnabled);

export const buttonStyleValidator = s.nativeEnum(ButtonStyle);

export const placeholderValidator = s.string.lengthLessThanOrEqual(150).setValidationEnabled(isValidationEnabled);
export const minMaxValidator = s.number.int
	.greaterThanOrEqual(0)
	.lessThanOrEqual(25)
	.setValidationEnabled(isValidationEnabled);

export const labelValueDescriptionValidator = s.string
	.lengthGreaterThanOrEqual(1)
	.lengthLessThanOrEqual(100)
	.setValidationEnabled(isValidationEnabled);

export const jsonOptionValidator = s
	.object({
		label: labelValueDescriptionValidator,
		value: labelValueDescriptionValidator,
		description: labelValueDescriptionValidator.optional,
		emoji: emojiValidator.optional,
		default: s.boolean.optional,
	})
	.setValidationEnabled(isValidationEnabled);

export const optionValidator = s.instance(StringSelectMenuOptionBuilder).setValidationEnabled(isValidationEnabled);

export const optionsValidator = optionValidator.array
	.lengthGreaterThanOrEqual(0)
	.setValidationEnabled(isValidationEnabled);
export const optionsLengthValidator = s.number.int
	.greaterThanOrEqual(0)
	.lessThanOrEqual(25)
	.setValidationEnabled(isValidationEnabled);

export function validateRequiredSelectMenuParameters(options: StringSelectMenuOptionBuilder[], customId?: string) {
	customIdValidator.parse(customId);
	optionsValidator.parse(options);
}

export const defaultValidator = s.boolean;

export function validateRequiredSelectMenuOptionParameters(label?: string, value?: string) {
	labelValueDescriptionValidator.parse(label);
	labelValueDescriptionValidator.parse(value);
}

export const channelTypesValidator = s.nativeEnum(ChannelType).array.setValidationEnabled(isValidationEnabled);

export const urlValidator = s.string
	.url({
		allowedProtocols: ['http:', 'https:', 'discord:'],
	})
	.setValidationEnabled(isValidationEnabled);

export function validateRequiredButtonParameters(
	style?: ButtonStyle,
	label?: string,
	emoji?: APIMessageComponentEmoji,
	customId?: string,
	skuId?: string,
	url?: string,
) {
	if (style === ButtonStyle.Premium) {
		if (!skuId) {
			throw new RangeError('Premium buttons must have an SKU id.');
		}

		if (customId || label || url || emoji) {
			throw new RangeError('Premium buttons cannot have a custom id, label, URL, or emoji.');
		}
	} else {
		if (skuId) {
			throw new RangeError('Non-premium buttons must not have an SKU id.');
		}

		if (url && customId) {
			throw new RangeError('URL and custom id are mutually exclusive.');
		}

		if (!label && !emoji) {
			throw new RangeError('Non-premium buttons must have a label and/or an emoji.');
		}

		if (style === ButtonStyle.Link) {
			if (!url) {
				throw new RangeError('Link buttons must have a URL.');
			}
		} else if (url) {
			throw new RangeError('Non-premium and non-link buttons cannot have a URL.');
		}
	}
}

```

# packages\builders\src\components\button\Button.ts

```ts
import {
	ComponentType,
	type APIButtonComponent,
	type APIButtonComponentWithCustomId,
	type APIButtonComponentWithSKUId,
	type APIButtonComponentWithURL,
	type APIMessageComponentEmoji,
	type ButtonStyle,
	type Snowflake,
} from 'discord-api-types/v10';
import {
	buttonLabelValidator,
	buttonStyleValidator,
	customIdValidator,
	disabledValidator,
	emojiValidator,
	urlValidator,
	validateRequiredButtonParameters,
} from '../Assertions.js';
import { ComponentBuilder } from '../Component.js';

/**
 * A builder that creates API-compatible JSON data for buttons.
 */
export class ButtonBuilder extends ComponentBuilder<APIButtonComponent> {
	/**
	 * Creates a new button from API data.
	 *
	 * @param data - The API data to create this button with
	 * @example
	 * Creating a button from an API data object:
	 * ```ts
	 * const button = new ButtonBuilder({
	 * 	custom_id: 'a cool button',
	 * 	style: ButtonStyle.Primary,
	 * 	label: 'Click Me',
	 * 	emoji: {
	 * 		name: 'smile',
	 * 		id: '123456789012345678',
	 * 	},
	 * });
	 * ```
	 * @example
	 * Creating a button using setters and API data:
	 * ```ts
	 * const button = new ButtonBuilder({
	 * 	style: ButtonStyle.Secondary,
	 * 	label: 'Click Me',
	 * })
	 * 	.setEmoji({ name: '🙂' })
	 * 	.setCustomId('another cool button');
	 * ```
	 */
	public constructor(data?: Partial<APIButtonComponent>) {
		super({ type: ComponentType.Button, ...data });
	}

	/**
	 * Sets the style of this button.
	 *
	 * @param style - The style to use
	 */
	public setStyle(style: ButtonStyle) {
		this.data.style = buttonStyleValidator.parse(style);
		return this;
	}

	/**
	 * Sets the URL for this button.
	 *
	 * @remarks
	 * This method is only available to buttons using the `Link` button style.
	 * Only three types of URL schemes are currently supported: `https://`, `http://`, and `discord://`.
	 * @param url - The URL to use
	 */
	public setURL(url: string) {
		(this.data as APIButtonComponentWithURL).url = urlValidator.parse(url);
		return this;
	}

	/**
	 * Sets the custom id for this button.
	 *
	 * @remarks
	 * This method is only applicable to buttons that are not using the `Link` button style.
	 * @param customId - The custom id to use
	 */
	public setCustomId(customId: string) {
		(this.data as APIButtonComponentWithCustomId).custom_id = customIdValidator.parse(customId);
		return this;
	}

	/**
	 * Sets the SKU id that represents a purchasable SKU for this button.
	 *
	 * @remarks Only available when using premium-style buttons.
	 * @param skuId - The SKU id to use
	 */
	public setSKUId(skuId: Snowflake) {
		(this.data as APIButtonComponentWithSKUId).sku_id = skuId;
		return this;
	}

	/**
	 * Sets the emoji to display on this button.
	 *
	 * @param emoji - The emoji to use
	 */
	public setEmoji(emoji: APIMessageComponentEmoji) {
		(this.data as Exclude<APIButtonComponent, APIButtonComponentWithSKUId>).emoji = emojiValidator.parse(emoji);
		return this;
	}

	/**
	 * Sets whether this button is disabled.
	 *
	 * @param disabled - Whether to disable this button
	 */
	public setDisabled(disabled = true) {
		this.data.disabled = disabledValidator.parse(disabled);
		return this;
	}

	/**
	 * Sets the label for this button.
	 *
	 * @param label - The label to use
	 */
	public setLabel(label: string) {
		(this.data as Exclude<APIButtonComponent, APIButtonComponentWithSKUId>).label = buttonLabelValidator.parse(label);
		return this;
	}

	/**
	 * {@inheritDoc ComponentBuilder.toJSON}
	 */
	public toJSON(): APIButtonComponent {
		validateRequiredButtonParameters(
			this.data.style,
			(this.data as Exclude<APIButtonComponent, APIButtonComponentWithSKUId>).label,
			(this.data as Exclude<APIButtonComponent, APIButtonComponentWithSKUId>).emoji,
			(this.data as APIButtonComponentWithCustomId).custom_id,
			(this.data as APIButtonComponentWithSKUId).sku_id,
			(this.data as APIButtonComponentWithURL).url,
		);

		return {
			...this.data,
		} as APIButtonComponent;
	}
}

```

# packages\builders\src\components\Component.ts

```ts
import type { JSONEncodable } from '@discordjs/util';
import type {
	APIActionRowComponent,
	APIActionRowComponentTypes,
	APIBaseComponent,
	ComponentType,
} from 'discord-api-types/v10';

/**
 * Any action row component data represented as an object.
 */
export type AnyAPIActionRowComponent = APIActionRowComponent<APIActionRowComponentTypes> | APIActionRowComponentTypes;

/**
 * The base component builder that contains common symbols for all sorts of components.
 *
 * @typeParam DataType - The type of internal API data that is stored within the component
 */
export abstract class ComponentBuilder<
	DataType extends Partial<APIBaseComponent<ComponentType>> = APIBaseComponent<ComponentType>,
> implements JSONEncodable<AnyAPIActionRowComponent>
{
	/**
	 * The API data associated with this component.
	 */
	public readonly data: Partial<DataType>;

	/**
	 * Serializes this builder to API-compatible JSON data.
	 *
	 * @remarks
	 * This method runs validations on the data before serializing it.
	 * As such, it may throw an error if the data is invalid.
	 */
	public abstract toJSON(): AnyAPIActionRowComponent;

	/**
	 * Constructs a new kind of component.
	 *
	 * @param data - The data to construct a component out of
	 */
	public constructor(data: Partial<DataType>) {
		this.data = data;
	}
}

```

# packages\builders\src\components\Components.ts

```ts
import { ComponentType, type APIMessageComponent, type APIModalComponent } from 'discord-api-types/v10';
import {
	ActionRowBuilder,
	type AnyComponentBuilder,
	type MessageComponentBuilder,
	type ModalComponentBuilder,
} from './ActionRow.js';
import { ComponentBuilder } from './Component.js';
import { ButtonBuilder } from './button/Button.js';
import { ChannelSelectMenuBuilder } from './selectMenu/ChannelSelectMenu.js';
import { MentionableSelectMenuBuilder } from './selectMenu/MentionableSelectMenu.js';
import { RoleSelectMenuBuilder } from './selectMenu/RoleSelectMenu.js';
import { StringSelectMenuBuilder } from './selectMenu/StringSelectMenu.js';
import { UserSelectMenuBuilder } from './selectMenu/UserSelectMenu.js';
import { TextInputBuilder } from './textInput/TextInput.js';

/**
 * Components here are mapped to their respective builder.
 */
export interface MappedComponentTypes {
	/**
	 * The action row component type is associated with an {@link ActionRowBuilder}.
	 */
	[ComponentType.ActionRow]: ActionRowBuilder<AnyComponentBuilder>;
	/**
	 * The button component type is associated with a {@link ButtonBuilder}.
	 */
	[ComponentType.Button]: ButtonBuilder;
	/**
	 * The string select component type is associated with a {@link StringSelectMenuBuilder}.
	 */
	[ComponentType.StringSelect]: StringSelectMenuBuilder;
	/**
	 * The text input component type is associated with a {@link TextInputBuilder}.
	 */
	[ComponentType.TextInput]: TextInputBuilder;
	/**
	 * The user select component type is associated with a {@link UserSelectMenuBuilder}.
	 */
	[ComponentType.UserSelect]: UserSelectMenuBuilder;
	/**
	 * The role select component type is associated with a {@link RoleSelectMenuBuilder}.
	 */
	[ComponentType.RoleSelect]: RoleSelectMenuBuilder;
	/**
	 * The mentionable select component type is associated with a {@link MentionableSelectMenuBuilder}.
	 */
	[ComponentType.MentionableSelect]: MentionableSelectMenuBuilder;
	/**
	 * The channel select component type is associated with a {@link ChannelSelectMenuBuilder}.
	 */
	[ComponentType.ChannelSelect]: ChannelSelectMenuBuilder;
}

/**
 * Factory for creating components from API data.
 *
 * @typeParam ComponentType - The type of component to use
 * @param data - The API data to transform to a component class
 */
export function createComponentBuilder<ComponentType extends keyof MappedComponentTypes>(
	// eslint-disable-next-line @typescript-eslint/sort-type-constituents
	data: (APIModalComponent | APIMessageComponent) & { type: ComponentType },
): MappedComponentTypes[ComponentType];

/**
 * Factory for creating components from API data.
 *
 * @typeParam ComponentBuilder - The type of component to use
 * @param data - The API data to transform to a component class
 */
export function createComponentBuilder<ComponentBuilder extends MessageComponentBuilder | ModalComponentBuilder>(
	data: ComponentBuilder,
): ComponentBuilder;

export function createComponentBuilder(
	data: APIMessageComponent | APIModalComponent | MessageComponentBuilder,
): ComponentBuilder {
	if (data instanceof ComponentBuilder) {
		return data;
	}

	switch (data.type) {
		case ComponentType.ActionRow:
			return new ActionRowBuilder(data);
		case ComponentType.Button:
			return new ButtonBuilder(data);
		case ComponentType.StringSelect:
			return new StringSelectMenuBuilder(data);
		case ComponentType.TextInput:
			return new TextInputBuilder(data);
		case ComponentType.UserSelect:
			return new UserSelectMenuBuilder(data);
		case ComponentType.RoleSelect:
			return new RoleSelectMenuBuilder(data);
		case ComponentType.MentionableSelect:
			return new MentionableSelectMenuBuilder(data);
		case ComponentType.ChannelSelect:
			return new ChannelSelectMenuBuilder(data);
		default:
			// @ts-expect-error This case can still occur if we get a newer unsupported component type
			throw new Error(`Cannot properly serialize component type: ${data.type}`);
	}
}

```

# packages\builders\src\components\selectMenu\BaseSelectMenu.ts

```ts
import type { APISelectMenuComponent } from 'discord-api-types/v10';
import { customIdValidator, disabledValidator, minMaxValidator, placeholderValidator } from '../Assertions.js';
import { ComponentBuilder } from '../Component.js';

/**
 * The base select menu builder that contains common symbols for select menu builders.
 *
 * @typeParam SelectMenuType - The type of select menu this would be instantiated for.
 */
export abstract class BaseSelectMenuBuilder<
	SelectMenuType extends APISelectMenuComponent,
> extends ComponentBuilder<SelectMenuType> {
	/**
	 * Sets the placeholder for this select menu.
	 *
	 * @param placeholder - The placeholder to use
	 */
	public setPlaceholder(placeholder: string) {
		this.data.placeholder = placeholderValidator.parse(placeholder);
		return this;
	}

	/**
	 * Sets the minimum values that must be selected in the select menu.
	 *
	 * @param minValues - The minimum values that must be selected
	 */
	public setMinValues(minValues: number) {
		this.data.min_values = minMaxValidator.parse(minValues);
		return this;
	}

	/**
	 * Sets the maximum values that must be selected in the select menu.
	 *
	 * @param maxValues - The maximum values that must be selected
	 */
	public setMaxValues(maxValues: number) {
		this.data.max_values = minMaxValidator.parse(maxValues);
		return this;
	}

	/**
	 * Sets the custom id for this select menu.
	 *
	 * @param customId - The custom id to use
	 */
	public setCustomId(customId: string) {
		this.data.custom_id = customIdValidator.parse(customId);
		return this;
	}

	/**
	 * Sets whether this select menu is disabled.
	 *
	 * @param disabled - Whether this select menu is disabled
	 */
	public setDisabled(disabled = true) {
		this.data.disabled = disabledValidator.parse(disabled);
		return this;
	}

	/**
	 * {@inheritDoc ComponentBuilder.toJSON}
	 */
	public toJSON(): SelectMenuType {
		customIdValidator.parse(this.data.custom_id);
		return {
			...this.data,
		} as SelectMenuType;
	}
}

```

# packages\builders\src\components\selectMenu\ChannelSelectMenu.ts

```ts
import {
	type APIChannelSelectComponent,
	type ChannelType,
	type Snowflake,
	ComponentType,
	SelectMenuDefaultValueType,
} from 'discord-api-types/v10';
import { type RestOrArray, normalizeArray } from '../../util/normalizeArray.js';
import { channelTypesValidator, customIdValidator, optionsLengthValidator } from '../Assertions.js';
import { BaseSelectMenuBuilder } from './BaseSelectMenu.js';

/**
 * A builder that creates API-compatible JSON data for channel select menus.
 */
export class ChannelSelectMenuBuilder extends BaseSelectMenuBuilder<APIChannelSelectComponent> {
	/**
	 * Creates a new select menu from API data.
	 *
	 * @param data - The API data to create this select menu with
	 * @example
	 * Creating a select menu from an API data object:
	 * ```ts
	 * const selectMenu = new ChannelSelectMenuBuilder({
	 * 	custom_id: 'a cool select menu',
	 * 	placeholder: 'select an option',
	 * 	max_values: 2,
	 * });
	 * ```
	 * @example
	 * Creating a select menu using setters and API data:
	 * ```ts
	 * const selectMenu = new ChannelSelectMenuBuilder({
	 * 	custom_id: 'a cool select menu',
	 * })
	 * 	.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
	 * 	.setMinValues(2);
	 * ```
	 */
	public constructor(data?: Partial<APIChannelSelectComponent>) {
		super({ ...data, type: ComponentType.ChannelSelect });
	}

	/**
	 * Adds channel types to this select menu.
	 *
	 * @param types - The channel types to use
	 */
	public addChannelTypes(...types: RestOrArray<ChannelType>) {
		const normalizedTypes = normalizeArray(types);
		this.data.channel_types ??= [];
		this.data.channel_types.push(...channelTypesValidator.parse(normalizedTypes));
		return this;
	}

	/**
	 * Sets channel types for this select menu.
	 *
	 * @param types - The channel types to use
	 */
	public setChannelTypes(...types: RestOrArray<ChannelType>) {
		const normalizedTypes = normalizeArray(types);
		this.data.channel_types ??= [];
		this.data.channel_types.splice(0, this.data.channel_types.length, ...channelTypesValidator.parse(normalizedTypes));
		return this;
	}

	/**
	 * Adds default channels to this auto populated select menu.
	 *
	 * @param channels - The channels to add
	 */
	public addDefaultChannels(...channels: RestOrArray<Snowflake>) {
		const normalizedValues = normalizeArray(channels);
		optionsLengthValidator.parse((this.data.default_values?.length ?? 0) + normalizedValues.length);
		this.data.default_values ??= [];

		this.data.default_values.push(
			...normalizedValues.map((id) => ({
				id,
				type: SelectMenuDefaultValueType.Channel as const,
			})),
		);

		return this;
	}

	/**
	 * Sets default channels for this auto populated select menu.
	 *
	 * @param channels - The channels to set
	 */
	public setDefaultChannels(...channels: RestOrArray<Snowflake>) {
		const normalizedValues = normalizeArray(channels);
		optionsLengthValidator.parse(normalizedValues.length);

		this.data.default_values = normalizedValues.map((id) => ({
			id,
			type: SelectMenuDefaultValueType.Channel as const,
		}));

		return this;
	}

	/**
	 * {@inheritDoc BaseSelectMenuBuilder.toJSON}
	 */
	public override toJSON(): APIChannelSelectComponent {
		customIdValidator.parse(this.data.custom_id);

		return {
			...this.data,
		} as APIChannelSelectComponent;
	}
}

```

# packages\builders\src\components\selectMenu\MentionableSelectMenu.ts

```ts
import {
	type APIMentionableSelectComponent,
	type APISelectMenuDefaultValue,
	type Snowflake,
	ComponentType,
	SelectMenuDefaultValueType,
} from 'discord-api-types/v10';
import { type RestOrArray, normalizeArray } from '../../util/normalizeArray.js';
import { optionsLengthValidator } from '../Assertions.js';
import { BaseSelectMenuBuilder } from './BaseSelectMenu.js';

/**
 * A builder that creates API-compatible JSON data for mentionable select menus.
 */
export class MentionableSelectMenuBuilder extends BaseSelectMenuBuilder<APIMentionableSelectComponent> {
	/**
	 * Creates a new select menu from API data.
	 *
	 * @param data - The API data to create this select menu with
	 * @example
	 * Creating a select menu from an API data object:
	 * ```ts
	 * const selectMenu = new MentionableSelectMenuBuilder({
	 * 	custom_id: 'a cool select menu',
	 * 	placeholder: 'select an option',
	 * 	max_values: 2,
	 * });
	 * ```
	 * @example
	 * Creating a select menu using setters and API data:
	 * ```ts
	 * const selectMenu = new MentionableSelectMenuBuilder({
	 * 	custom_id: 'a cool select menu',
	 * })
	 * 	.setMinValues(1);
	 * ```
	 */
	public constructor(data?: Partial<APIMentionableSelectComponent>) {
		super({ ...data, type: ComponentType.MentionableSelect });
	}

	/**
	 * Adds default roles to this auto populated select menu.
	 *
	 * @param roles - The roles to add
	 */
	public addDefaultRoles(...roles: RestOrArray<Snowflake>) {
		const normalizedValues = normalizeArray(roles);
		optionsLengthValidator.parse((this.data.default_values?.length ?? 0) + normalizedValues.length);
		this.data.default_values ??= [];

		this.data.default_values.push(
			...normalizedValues.map((id) => ({
				id,
				type: SelectMenuDefaultValueType.Role as const,
			})),
		);

		return this;
	}

	/**
	 * Adds default users to this auto populated select menu.
	 *
	 * @param users - The users to add
	 */
	public addDefaultUsers(...users: RestOrArray<Snowflake>) {
		const normalizedValues = normalizeArray(users);
		optionsLengthValidator.parse((this.data.default_values?.length ?? 0) + normalizedValues.length);
		this.data.default_values ??= [];

		this.data.default_values.push(
			...normalizedValues.map((id) => ({
				id,
				type: SelectMenuDefaultValueType.User as const,
			})),
		);

		return this;
	}

	/**
	 * Adds default values to this auto populated select menu.
	 *
	 * @param values - The values to add
	 */
	public addDefaultValues(
		...values: RestOrArray<
			| APISelectMenuDefaultValue<SelectMenuDefaultValueType.Role>
			| APISelectMenuDefaultValue<SelectMenuDefaultValueType.User>
		>
	) {
		const normalizedValues = normalizeArray(values);
		optionsLengthValidator.parse((this.data.default_values?.length ?? 0) + normalizedValues.length);
		this.data.default_values ??= [];
		this.data.default_values.push(...normalizedValues);
		return this;
	}

	/**
	 * Sets default values for this auto populated select menu.
	 *
	 * @param values - The values to set
	 */
	public setDefaultValues(
		...values: RestOrArray<
			| APISelectMenuDefaultValue<SelectMenuDefaultValueType.Role>
			| APISelectMenuDefaultValue<SelectMenuDefaultValueType.User>
		>
	) {
		const normalizedValues = normalizeArray(values);
		optionsLengthValidator.parse(normalizedValues.length);
		this.data.default_values = normalizedValues;
		return this;
	}
}

```

# packages\builders\src\components\selectMenu\RoleSelectMenu.ts

```ts
import {
	type APIRoleSelectComponent,
	type Snowflake,
	ComponentType,
	SelectMenuDefaultValueType,
} from 'discord-api-types/v10';
import { type RestOrArray, normalizeArray } from '../../util/normalizeArray.js';
import { optionsLengthValidator } from '../Assertions.js';
import { BaseSelectMenuBuilder } from './BaseSelectMenu.js';

/**
 * A builder that creates API-compatible JSON data for role select menus.
 */
export class RoleSelectMenuBuilder extends BaseSelectMenuBuilder<APIRoleSelectComponent> {
	/**
	 * Creates a new select menu from API data.
	 *
	 * @param data - The API data to create this select menu with
	 * @example
	 * Creating a select menu from an API data object:
	 * ```ts
	 * const selectMenu = new RoleSelectMenuBuilder({
	 * 	custom_id: 'a cool select menu',
	 * 	placeholder: 'select an option',
	 * 	max_values: 2,
	 * });
	 * ```
	 * @example
	 * Creating a select menu using setters and API data:
	 * ```ts
	 * const selectMenu = new RoleSelectMenuBuilder({
	 * 	custom_id: 'a cool select menu',
	 * })
	 * 	.setMinValues(1);
	 * ```
	 */
	public constructor(data?: Partial<APIRoleSelectComponent>) {
		super({ ...data, type: ComponentType.RoleSelect });
	}

	/**
	 * Adds default roles to this auto populated select menu.
	 *
	 * @param roles - The roles to add
	 */
	public addDefaultRoles(...roles: RestOrArray<Snowflake>) {
		const normalizedValues = normalizeArray(roles);
		optionsLengthValidator.parse((this.data.default_values?.length ?? 0) + normalizedValues.length);
		this.data.default_values ??= [];

		this.data.default_values.push(
			...normalizedValues.map((id) => ({
				id,
				type: SelectMenuDefaultValueType.Role as const,
			})),
		);

		return this;
	}

	/**
	 * Sets default roles for this auto populated select menu.
	 *
	 * @param roles - The roles to set
	 */
	public setDefaultRoles(...roles: RestOrArray<Snowflake>) {
		const normalizedValues = normalizeArray(roles);
		optionsLengthValidator.parse(normalizedValues.length);

		this.data.default_values = normalizedValues.map((id) => ({
			id,
			type: SelectMenuDefaultValueType.Role as const,
		}));

		return this;
	}
}

```

# packages\builders\src\components\selectMenu\StringSelectMenu.ts

```ts
import { ComponentType } from 'discord-api-types/v10';
import type { APIStringSelectComponent, APISelectMenuOption } from 'discord-api-types/v10';
import { normalizeArray, type RestOrArray } from '../../util/normalizeArray.js';
import { jsonOptionValidator, optionsLengthValidator, validateRequiredSelectMenuParameters } from '../Assertions.js';
import { BaseSelectMenuBuilder } from './BaseSelectMenu.js';
import { StringSelectMenuOptionBuilder } from './StringSelectMenuOption.js';

/**
 * A builder that creates API-compatible JSON data for string select menus.
 */
export class StringSelectMenuBuilder extends BaseSelectMenuBuilder<APIStringSelectComponent> {
	/**
	 * The options within this select menu.
	 */
	public readonly options: StringSelectMenuOptionBuilder[];

	/**
	 * Creates a new select menu from API data.
	 *
	 * @param data - The API data to create this select menu with
	 * @example
	 * Creating a select menu from an API data object:
	 * ```ts
	 * const selectMenu = new StringSelectMenuBuilder({
	 * 	custom_id: 'a cool select menu',
	 * 	placeholder: 'select an option',
	 * 	max_values: 2,
	 * 	options: [
	 * 		{ label: 'option 1', value: '1' },
	 * 		{ label: 'option 2', value: '2' },
	 * 		{ label: 'option 3', value: '3' },
	 * 	],
	 * });
	 * ```
	 * @example
	 * Creating a select menu using setters and API data:
	 * ```ts
	 * const selectMenu = new StringSelectMenuBuilder({
	 * 	custom_id: 'a cool select menu',
	 * })
	 * 	.setMinValues(1)
	 * 	.addOptions({
	 * 		label: 'Catchy',
	 * 		value: 'catch',
	 * 	});
	 * ```
	 */
	public constructor(data?: Partial<APIStringSelectComponent>) {
		const { options, ...initData } = data ?? {};
		super({ ...initData, type: ComponentType.StringSelect });
		this.options = options?.map((option: APISelectMenuOption) => new StringSelectMenuOptionBuilder(option)) ?? [];
	}

	/**
	 * Adds options to this select menu.
	 *
	 * @param options - The options to add
	 */
	public addOptions(...options: RestOrArray<APISelectMenuOption | StringSelectMenuOptionBuilder>) {
		const normalizedOptions = normalizeArray(options);
		optionsLengthValidator.parse(this.options.length + normalizedOptions.length);
		this.options.push(
			...normalizedOptions.map((normalizedOption) =>
				normalizedOption instanceof StringSelectMenuOptionBuilder
					? normalizedOption
					: new StringSelectMenuOptionBuilder(jsonOptionValidator.parse(normalizedOption)),
			),
		);
		return this;
	}

	/**
	 * Sets the options for this select menu.
	 *
	 * @param options - The options to set
	 */
	public setOptions(...options: RestOrArray<APISelectMenuOption | StringSelectMenuOptionBuilder>) {
		return this.spliceOptions(0, this.options.length, ...options);
	}

	/**
	 * Removes, replaces, or inserts options for this select menu.
	 *
	 * @remarks
	 * This method behaves similarly
	 * to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice | Array.prototype.splice()}.
	 * It's useful for modifying and adjusting the order of existing options.
	 * @example
	 * Remove the first option:
	 * ```ts
	 * selectMenu.spliceOptions(0, 1);
	 * ```
	 * @example
	 * Remove the first n option:
	 * ```ts
	 * const n = 4;
	 * selectMenu.spliceOptions(0, n);
	 * ```
	 * @example
	 * Remove the last option:
	 * ```ts
	 * selectMenu.spliceOptions(-1, 1);
	 * ```
	 * @param index - The index to start at
	 * @param deleteCount - The number of options to remove
	 * @param options - The replacing option objects or builders
	 */
	public spliceOptions(
		index: number,
		deleteCount: number,
		...options: RestOrArray<APISelectMenuOption | StringSelectMenuOptionBuilder>
	) {
		const normalizedOptions = normalizeArray(options);

		const clone = [...this.options];

		clone.splice(
			index,
			deleteCount,
			...normalizedOptions.map((normalizedOption) =>
				normalizedOption instanceof StringSelectMenuOptionBuilder
					? normalizedOption
					: new StringSelectMenuOptionBuilder(jsonOptionValidator.parse(normalizedOption)),
			),
		);

		optionsLengthValidator.parse(clone.length);
		this.options.splice(0, this.options.length, ...clone);
		return this;
	}

	/**
	 * {@inheritDoc BaseSelectMenuBuilder.toJSON}
	 */
	public override toJSON(): APIStringSelectComponent {
		validateRequiredSelectMenuParameters(this.options, this.data.custom_id);

		return {
			...this.data,
			options: this.options.map((option) => option.toJSON()),
		} as APIStringSelectComponent;
	}
}

```

# packages\builders\src\components\selectMenu\StringSelectMenuOption.ts

```ts
import type { JSONEncodable } from '@discordjs/util';
import type { APIMessageComponentEmoji, APISelectMenuOption } from 'discord-api-types/v10';
import {
	defaultValidator,
	emojiValidator,
	labelValueDescriptionValidator,
	validateRequiredSelectMenuOptionParameters,
} from '../Assertions.js';

/**
 * A builder that creates API-compatible JSON data for string select menu options.
 */
export class StringSelectMenuOptionBuilder implements JSONEncodable<APISelectMenuOption> {
	/**
	 * Creates a new string select menu option from API data.
	 *
	 * @param data - The API data to create this string select menu option with
	 * @example
	 * Creating a string select menu option from an API data object:
	 * ```ts
	 * const selectMenuOption = new SelectMenuOptionBuilder({
	 * 	label: 'catchy label',
	 * 	value: '1',
	 * });
	 * ```
	 * @example
	 * Creating a string select menu option using setters and API data:
	 * ```ts
	 * const selectMenuOption = new SelectMenuOptionBuilder({
	 * 	default: true,
	 * 	value: '1',
	 * })
	 * 	.setLabel('woah');
	 * ```
	 */
	public constructor(public data: Partial<APISelectMenuOption> = {}) {}

	/**
	 * Sets the label for this option.
	 *
	 * @param label - The label to use
	 */
	public setLabel(label: string) {
		this.data.label = labelValueDescriptionValidator.parse(label);
		return this;
	}

	/**
	 * Sets the value for this option.
	 *
	 * @param value - The value to use
	 */
	public setValue(value: string) {
		this.data.value = labelValueDescriptionValidator.parse(value);
		return this;
	}

	/**
	 * Sets the description for this option.
	 *
	 * @param description - The description to use
	 */
	public setDescription(description: string) {
		this.data.description = labelValueDescriptionValidator.parse(description);
		return this;
	}

	/**
	 * Sets whether this option is selected by default.
	 *
	 * @param isDefault - Whether this option is selected by default
	 */
	public setDefault(isDefault = true) {
		this.data.default = defaultValidator.parse(isDefault);
		return this;
	}

	/**
	 * Sets the emoji to display for this option.
	 *
	 * @param emoji - The emoji to use
	 */
	public setEmoji(emoji: APIMessageComponentEmoji) {
		this.data.emoji = emojiValidator.parse(emoji);
		return this;
	}

	/**
	 * {@inheritDoc BaseSelectMenuBuilder.toJSON}
	 */
	public toJSON(): APISelectMenuOption {
		validateRequiredSelectMenuOptionParameters(this.data.label, this.data.value);

		return {
			...this.data,
		} as APISelectMenuOption;
	}
}

```

# packages\builders\src\components\selectMenu\UserSelectMenu.ts

```ts
import {
	type APIUserSelectComponent,
	type Snowflake,
	ComponentType,
	SelectMenuDefaultValueType,
} from 'discord-api-types/v10';
import { type RestOrArray, normalizeArray } from '../../util/normalizeArray.js';
import { optionsLengthValidator } from '../Assertions.js';
import { BaseSelectMenuBuilder } from './BaseSelectMenu.js';

/**
 * A builder that creates API-compatible JSON data for user select menus.
 */
export class UserSelectMenuBuilder extends BaseSelectMenuBuilder<APIUserSelectComponent> {
	/**
	 * Creates a new select menu from API data.
	 *
	 * @param data - The API data to create this select menu with
	 * @example
	 * Creating a select menu from an API data object:
	 * ```ts
	 * const selectMenu = new UserSelectMenuBuilder({
	 * 	custom_id: 'a cool select menu',
	 * 	placeholder: 'select an option',
	 * 	max_values: 2,
	 * });
	 * ```
	 * @example
	 * Creating a select menu using setters and API data:
	 * ```ts
	 * const selectMenu = new UserSelectMenuBuilder({
	 * 	custom_id: 'a cool select menu',
	 * })
	 * 	.setMinValues(1);
	 * ```
	 */
	public constructor(data?: Partial<APIUserSelectComponent>) {
		super({ ...data, type: ComponentType.UserSelect });
	}

	/**
	 * Adds default users to this auto populated select menu.
	 *
	 * @param users - The users to add
	 */
	public addDefaultUsers(...users: RestOrArray<Snowflake>) {
		const normalizedValues = normalizeArray(users);
		optionsLengthValidator.parse((this.data.default_values?.length ?? 0) + normalizedValues.length);
		this.data.default_values ??= [];

		this.data.default_values.push(
			...normalizedValues.map((id) => ({
				id,
				type: SelectMenuDefaultValueType.User as const,
			})),
		);

		return this;
	}

	/**
	 * Sets default users for this auto populated select menu.
	 *
	 * @param users - The users to set
	 */
	public setDefaultUsers(...users: RestOrArray<Snowflake>) {
		const normalizedValues = normalizeArray(users);
		optionsLengthValidator.parse(normalizedValues.length);

		this.data.default_values = normalizedValues.map((id) => ({
			id,
			type: SelectMenuDefaultValueType.User as const,
		}));

		return this;
	}
}

```

# packages\builders\src\components\textInput\Assertions.ts

```ts
import { s } from '@sapphire/shapeshift';
import { TextInputStyle } from 'discord-api-types/v10';
import { isValidationEnabled } from '../../util/validation.js';
import { customIdValidator } from '../Assertions.js';

export const textInputStyleValidator = s.nativeEnum(TextInputStyle);
export const minLengthValidator = s.number.int
	.greaterThanOrEqual(0)
	.lessThanOrEqual(4_000)
	.setValidationEnabled(isValidationEnabled);
export const maxLengthValidator = s.number.int
	.greaterThanOrEqual(1)
	.lessThanOrEqual(4_000)
	.setValidationEnabled(isValidationEnabled);
export const requiredValidator = s.boolean;
export const valueValidator = s.string.lengthLessThanOrEqual(4_000).setValidationEnabled(isValidationEnabled);
export const placeholderValidator = s.string.lengthLessThanOrEqual(100).setValidationEnabled(isValidationEnabled);
export const labelValidator = s.string
	.lengthGreaterThanOrEqual(1)
	.lengthLessThanOrEqual(45)
	.setValidationEnabled(isValidationEnabled);

export function validateRequiredParameters(customId?: string, style?: TextInputStyle, label?: string) {
	customIdValidator.parse(customId);
	textInputStyleValidator.parse(style);
	labelValidator.parse(label);
}

```

# packages\builders\src\components\textInput\TextInput.ts

```ts
import { isJSONEncodable, type Equatable, type JSONEncodable } from '@discordjs/util';
import { ComponentType, type TextInputStyle, type APITextInputComponent } from 'discord-api-types/v10';
import isEqual from 'fast-deep-equal';
import { customIdValidator } from '../Assertions.js';
import { ComponentBuilder } from '../Component.js';
import {
	maxLengthValidator,
	minLengthValidator,
	placeholderValidator,
	requiredValidator,
	valueValidator,
	validateRequiredParameters,
	labelValidator,
	textInputStyleValidator,
} from './Assertions.js';

/**
 * A builder that creates API-compatible JSON data for text inputs.
 */
export class TextInputBuilder
	extends ComponentBuilder<APITextInputComponent>
	implements Equatable<APITextInputComponent | JSONEncodable<APITextInputComponent>>
{
	/**
	 * Creates a new text input from API data.
	 *
	 * @param data - The API data to create this text input with
	 * @example
	 * Creating a text input from an API data object:
	 * ```ts
	 * const textInput = new TextInputBuilder({
	 * 	custom_id: 'a cool text input',
	 * 	label: 'Type something',
	 * 	style: TextInputStyle.Short,
	 * });
	 * ```
	 * @example
	 * Creating a text input using setters and API data:
	 * ```ts
	 * const textInput = new TextInputBuilder({
	 * 	label: 'Type something else',
	 * })
	 * 	.setCustomId('woah')
	 * 	.setStyle(TextInputStyle.Paragraph);
	 * ```
	 */
	public constructor(data?: APITextInputComponent & { type?: ComponentType.TextInput }) {
		super({ type: ComponentType.TextInput, ...data });
	}

	/**
	 * Sets the custom id for this text input.
	 *
	 * @param customId - The custom id to use
	 */
	public setCustomId(customId: string) {
		this.data.custom_id = customIdValidator.parse(customId);
		return this;
	}

	/**
	 * Sets the label for this text input.
	 *
	 * @param label - The label to use
	 */
	public setLabel(label: string) {
		this.data.label = labelValidator.parse(label);
		return this;
	}

	/**
	 * Sets the style for this text input.
	 *
	 * @param style - The style to use
	 */
	public setStyle(style: TextInputStyle) {
		this.data.style = textInputStyleValidator.parse(style);
		return this;
	}

	/**
	 * Sets the minimum length of text for this text input.
	 *
	 * @param minLength - The minimum length of text for this text input
	 */
	public setMinLength(minLength: number) {
		this.data.min_length = minLengthValidator.parse(minLength);
		return this;
	}

	/**
	 * Sets the maximum length of text for this text input.
	 *
	 * @param maxLength - The maximum length of text for this text input
	 */
	public setMaxLength(maxLength: number) {
		this.data.max_length = maxLengthValidator.parse(maxLength);
		return this;
	}

	/**
	 * Sets the placeholder for this text input.
	 *
	 * @param placeholder - The placeholder to use
	 */
	public setPlaceholder(placeholder: string) {
		this.data.placeholder = placeholderValidator.parse(placeholder);
		return this;
	}

	/**
	 * Sets the value for this text input.
	 *
	 * @param value - The value to use
	 */
	public setValue(value: string) {
		this.data.value = valueValidator.parse(value);
		return this;
	}

	/**
	 * Sets whether this text input is required.
	 *
	 * @param required - Whether this text input is required
	 */
	public setRequired(required = true) {
		this.data.required = requiredValidator.parse(required);
		return this;
	}

	/**
	 * {@inheritDoc ComponentBuilder.toJSON}
	 */
	public toJSON(): APITextInputComponent {
		validateRequiredParameters(this.data.custom_id, this.data.style, this.data.label);

		return {
			...this.data,
		} as APITextInputComponent;
	}

	/**
	 * Whether this is equal to another structure.
	 */
	public equals(other: APITextInputComponent | JSONEncodable<APITextInputComponent>): boolean {
		if (isJSONEncodable(other)) {
			return isEqual(other.toJSON(), this.data);
		}

		return isEqual(other, this.data);
	}
}

```

# packages\builders\src\index.ts

```ts
export * as EmbedAssertions from './messages/embed/Assertions.js';
export * from './messages/embed/Embed.js';
// TODO: Consider removing this dep in the next major version
export * from '@discordjs/formatters';

export * as ComponentAssertions from './components/Assertions.js';
export * from './components/ActionRow.js';
export * from './components/button/Button.js';
export * from './components/Component.js';
export * from './components/Components.js';
export * from './components/textInput/TextInput.js';
export * as TextInputAssertions from './components/textInput/Assertions.js';
export * from './interactions/modals/Modal.js';
export * as ModalAssertions from './interactions/modals/Assertions.js';

export * from './components/selectMenu/BaseSelectMenu.js';
export * from './components/selectMenu/ChannelSelectMenu.js';
export * from './components/selectMenu/MentionableSelectMenu.js';
export * from './components/selectMenu/RoleSelectMenu.js';
export * from './components/selectMenu/StringSelectMenu.js';
// TODO: Remove those aliases in v2
export {
	/**
	 * @deprecated Will be removed in the next major version, use {@link StringSelectMenuBuilder} instead.
	 */
	StringSelectMenuBuilder as SelectMenuBuilder,
} from './components/selectMenu/StringSelectMenu.js';
export {
	/**
	 * @deprecated Will be removed in the next major version, use {@link StringSelectMenuOptionBuilder} instead.
	 */
	StringSelectMenuOptionBuilder as SelectMenuOptionBuilder,
} from './components/selectMenu/StringSelectMenuOption.js';
export * from './components/selectMenu/StringSelectMenuOption.js';
export * from './components/selectMenu/UserSelectMenu.js';

export * as SlashCommandAssertions from './interactions/slashCommands/Assertions.js';
export * from './interactions/slashCommands/SlashCommandBuilder.js';
export * from './interactions/slashCommands/SlashCommandSubcommands.js';
export * from './interactions/slashCommands/options/boolean.js';
export * from './interactions/slashCommands/options/channel.js';
export * from './interactions/slashCommands/options/integer.js';
export * from './interactions/slashCommands/options/mentionable.js';
export * from './interactions/slashCommands/options/number.js';
export * from './interactions/slashCommands/options/role.js';
export * from './interactions/slashCommands/options/attachment.js';
export * from './interactions/slashCommands/options/string.js';
export * from './interactions/slashCommands/options/user.js';
export * from './interactions/slashCommands/mixins/ApplicationCommandNumericOptionMinMaxValueMixin.js';
export * from './interactions/slashCommands/mixins/ApplicationCommandOptionBase.js';
export * from './interactions/slashCommands/mixins/ApplicationCommandOptionChannelTypesMixin.js';
export * from './interactions/slashCommands/mixins/ApplicationCommandOptionWithAutocompleteMixin.js';
export * from './interactions/slashCommands/mixins/ApplicationCommandOptionWithChoicesMixin.js';
export * from './interactions/slashCommands/mixins/NameAndDescription.js';
export * from './interactions/slashCommands/mixins/SharedSlashCommandOptions.js';
export * from './interactions/slashCommands/mixins/SharedSubcommands.js';
export * from './interactions/slashCommands/mixins/SharedSlashCommand.js';

export * as ContextMenuCommandAssertions from './interactions/contextMenuCommands/Assertions.js';
export * from './interactions/contextMenuCommands/ContextMenuCommandBuilder.js';

export * from './util/componentUtil.js';
export * from './util/normalizeArray.js';
export * from './util/validation.js';

/**
 * The {@link https://github.com/discordjs/discord.js/blob/main/packages/builders#readme | @discordjs/builders} version
 * that you are currently using.
 *
 * @privateRemarks This needs to explicitly be `string` so it is not typed as a "const string" that gets injected by esbuild.
 */
export const version = '[VI]{{inject}}[/VI]' as string;

```

# packages\builders\src\interactions\contextMenuCommands\Assertions.ts

```ts
import { s } from '@sapphire/shapeshift';
import { ApplicationCommandType, ApplicationIntegrationType, InteractionContextType } from 'discord-api-types/v10';
import { isValidationEnabled } from '../../util/validation.js';
import type { ContextMenuCommandType } from './ContextMenuCommandBuilder.js';

const namePredicate = s.string
	.lengthGreaterThanOrEqual(1)
	.lengthLessThanOrEqual(32)
	// eslint-disable-next-line prefer-named-capture-group
	.regex(/^( *[\p{P}\p{L}\p{N}\p{sc=Devanagari}\p{sc=Thai}]+ *)+$/u)
	.setValidationEnabled(isValidationEnabled);
const typePredicate = s
	.union(s.literal(ApplicationCommandType.User), s.literal(ApplicationCommandType.Message))
	.setValidationEnabled(isValidationEnabled);
const booleanPredicate = s.boolean;

export function validateDefaultPermission(value: unknown): asserts value is boolean {
	booleanPredicate.parse(value);
}

export function validateName(name: unknown): asserts name is string {
	namePredicate.parse(name);
}

export function validateType(type: unknown): asserts type is ContextMenuCommandType {
	typePredicate.parse(type);
}

export function validateRequiredParameters(name: string, type: number) {
	// Assert name matches all conditions
	validateName(name);

	// Assert type is valid
	validateType(type);
}

const dmPermissionPredicate = s.boolean.nullish;

export function validateDMPermission(value: unknown): asserts value is boolean | null | undefined {
	dmPermissionPredicate.parse(value);
}

const memberPermissionPredicate = s.union(
	s.bigint.transform((value) => value.toString()),
	s.number.safeInt.transform((value) => value.toString()),
	s.string.regex(/^\d+$/),
).nullish;

export function validateDefaultMemberPermissions(permissions: unknown) {
	return memberPermissionPredicate.parse(permissions);
}

export const contextsPredicate = s.array(
	s.nativeEnum(InteractionContextType).setValidationEnabled(isValidationEnabled),
);

export const integrationTypesPredicate = s.array(
	s.nativeEnum(ApplicationIntegrationType).setValidationEnabled(isValidationEnabled),
);

```

# packages\builders\src\interactions\contextMenuCommands\ContextMenuCommandBuilder.ts

```ts
import type {
	ApplicationCommandType,
	ApplicationIntegrationType,
	InteractionContextType,
	LocaleString,
	LocalizationMap,
	Permissions,
	RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import type { RestOrArray } from '../../util/normalizeArray.js';
import { normalizeArray } from '../../util/normalizeArray.js';
import { validateLocale, validateLocalizationMap } from '../slashCommands/Assertions.js';
import {
	validateRequiredParameters,
	validateName,
	validateType,
	validateDefaultPermission,
	validateDefaultMemberPermissions,
	validateDMPermission,
	contextsPredicate,
	integrationTypesPredicate,
} from './Assertions.js';

/**
 * The type a context menu command can be.
 */
export type ContextMenuCommandType = ApplicationCommandType.Message | ApplicationCommandType.User;

/**
 * A builder that creates API-compatible JSON data for context menu commands.
 */
export class ContextMenuCommandBuilder {
	/**
	 * The name of this command.
	 */
	public readonly name: string = undefined!;

	/**
	 * The name localizations of this command.
	 */
	public readonly name_localizations?: LocalizationMap;

	/**
	 * The type of this command.
	 */
	public readonly type: ContextMenuCommandType = undefined!;

	/**
	 * The contexts for this command.
	 */
	public readonly contexts?: InteractionContextType[];

	/**
	 * Whether this command is enabled by default when the application is added to a guild.
	 *
	 * @deprecated Use {@link ContextMenuCommandBuilder.setDefaultMemberPermissions} or {@link ContextMenuCommandBuilder.setDMPermission} instead.
	 */
	public readonly default_permission: boolean | undefined = undefined;

	/**
	 * The set of permissions represented as a bit set for the command.
	 */
	public readonly default_member_permissions: Permissions | null | undefined = undefined;

	/**
	 * Indicates whether the command is available in direct messages with the application.
	 *
	 * @remarks
	 * By default, commands are visible. This property is only for global commands.
	 */
	public readonly dm_permission: boolean | undefined = undefined;

	/**
	 * The integration types for this command.
	 */
	public readonly integration_types?: ApplicationIntegrationType[];

	/**
	 * Sets the contexts of this command.
	 *
	 * @param contexts - The contexts
	 */
	public setContexts(...contexts: RestOrArray<InteractionContextType>) {
		Reflect.set(this, 'contexts', contextsPredicate.parse(normalizeArray(contexts)));

		return this;
	}

	/**
	 * Sets integration types of this command.
	 *
	 * @param integrationTypes - The integration types
	 */
	public setIntegrationTypes(...integrationTypes: RestOrArray<ApplicationIntegrationType>) {
		Reflect.set(this, 'integration_types', integrationTypesPredicate.parse(normalizeArray(integrationTypes)));

		return this;
	}

	/**
	 * Sets the name of this command.
	 *
	 * @param name - The name to use
	 */
	public setName(name: string) {
		// Assert the name matches the conditions
		validateName(name);

		Reflect.set(this, 'name', name);

		return this;
	}

	/**
	 * Sets the type of this command.
	 *
	 * @param type - The type to use
	 */
	public setType(type: ContextMenuCommandType) {
		// Assert the type is valid
		validateType(type);

		Reflect.set(this, 'type', type);

		return this;
	}

	/**
	 * Sets whether the command is enabled by default when the application is added to a guild.
	 *
	 * @remarks
	 * If set to `false`, you will have to later `PUT` the permissions for this command.
	 * @param value - Whether to enable this command by default
	 * @see {@link https://discord.com/developers/docs/interactions/application-commands#permissions}
	 * @deprecated Use {@link ContextMenuCommandBuilder.setDefaultMemberPermissions} or {@link ContextMenuCommandBuilder.setDMPermission} instead.
	 */
	public setDefaultPermission(value: boolean) {
		// Assert the value matches the conditions
		validateDefaultPermission(value);

		Reflect.set(this, 'default_permission', value);

		return this;
	}

	/**
	 * Sets the default permissions a member should have in order to run this command.
	 *
	 * @remarks
	 * You can set this to `'0'` to disable the command by default.
	 * @param permissions - The permissions bit field to set
	 * @see {@link https://discord.com/developers/docs/interactions/application-commands#permissions}
	 */
	public setDefaultMemberPermissions(permissions: Permissions | bigint | number | null | undefined) {
		// Assert the value and parse it
		const permissionValue = validateDefaultMemberPermissions(permissions);

		Reflect.set(this, 'default_member_permissions', permissionValue);

		return this;
	}

	/**
	 * Sets if the command is available in direct messages with the application.
	 *
	 * @remarks
	 * By default, commands are visible. This method is only for global commands.
	 * @param enabled - Whether the command should be enabled in direct messages
	 * @see {@link https://discord.com/developers/docs/interactions/application-commands#permissions}
	 */
	public setDMPermission(enabled: boolean | null | undefined) {
		// Assert the value matches the conditions
		validateDMPermission(enabled);

		Reflect.set(this, 'dm_permission', enabled);

		return this;
	}

	/**
	 * Sets a name localization for this command.
	 *
	 * @param locale - The locale to set
	 * @param localizedName - The localized name for the given `locale`
	 */
	public setNameLocalization(locale: LocaleString, localizedName: string | null) {
		if (!this.name_localizations) {
			Reflect.set(this, 'name_localizations', {});
		}

		const parsedLocale = validateLocale(locale);

		if (localizedName === null) {
			this.name_localizations![parsedLocale] = null;
			return this;
		}

		validateName(localizedName);

		this.name_localizations![parsedLocale] = localizedName;
		return this;
	}

	/**
	 * Sets the name localizations for this command.
	 *
	 * @param localizedNames - The object of localized names to set
	 */
	public setNameLocalizations(localizedNames: LocalizationMap | null) {
		if (localizedNames === null) {
			Reflect.set(this, 'name_localizations', null);
			return this;
		}

		Reflect.set(this, 'name_localizations', {});

		for (const args of Object.entries(localizedNames))
			this.setNameLocalization(...(args as [LocaleString, string | null]));
		return this;
	}

	/**
	 * Serializes this builder to API-compatible JSON data.
	 *
	 * @remarks
	 * This method runs validations on the data before serializing it.
	 * As such, it may throw an error if the data is invalid.
	 */
	public toJSON(): RESTPostAPIContextMenuApplicationCommandsJSONBody {
		validateRequiredParameters(this.name, this.type);

		validateLocalizationMap(this.name_localizations);

		return { ...this };
	}
}

```

# packages\builders\src\interactions\modals\Assertions.ts

```ts
import { s } from '@sapphire/shapeshift';
import { ActionRowBuilder, type ModalActionRowComponentBuilder } from '../../components/ActionRow.js';
import { customIdValidator } from '../../components/Assertions.js';
import { isValidationEnabled } from '../../util/validation.js';

export const titleValidator = s.string
	.lengthGreaterThanOrEqual(1)
	.lengthLessThanOrEqual(45)
	.setValidationEnabled(isValidationEnabled);
export const componentsValidator = s
	.instance(ActionRowBuilder)
	.array.lengthGreaterThanOrEqual(1)
	.setValidationEnabled(isValidationEnabled);

export function validateRequiredParameters(
	customId?: string,
	title?: string,
	components?: ActionRowBuilder<ModalActionRowComponentBuilder>[],
) {
	customIdValidator.parse(customId);
	titleValidator.parse(title);
	componentsValidator.parse(components);
}

```

# packages\builders\src\interactions\modals\Modal.ts

```ts
/* eslint-disable jsdoc/check-param-names */

import type { JSONEncodable } from '@discordjs/util';
import type {
	APIActionRowComponent,
	APIModalActionRowComponent,
	APIModalInteractionResponseCallbackData,
} from 'discord-api-types/v10';
import { ActionRowBuilder, type ModalActionRowComponentBuilder } from '../../components/ActionRow.js';
import { customIdValidator } from '../../components/Assertions.js';
import { createComponentBuilder } from '../../components/Components.js';
import { normalizeArray, type RestOrArray } from '../../util/normalizeArray.js';
import { titleValidator, validateRequiredParameters } from './Assertions.js';

/**
 * A builder that creates API-compatible JSON data for modals.
 */
export class ModalBuilder implements JSONEncodable<APIModalInteractionResponseCallbackData> {
	/**
	 * The API data associated with this modal.
	 */
	public readonly data: Partial<APIModalInteractionResponseCallbackData>;

	/**
	 * The components within this modal.
	 */
	public readonly components: ActionRowBuilder<ModalActionRowComponentBuilder>[] = [];

	/**
	 * Creates a new modal from API data.
	 *
	 * @param data - The API data to create this modal with
	 */
	public constructor({ components, ...data }: Partial<APIModalInteractionResponseCallbackData> = {}) {
		this.data = { ...data };
		this.components = (components?.map((component) => createComponentBuilder(component)) ??
			[]) as ActionRowBuilder<ModalActionRowComponentBuilder>[];
	}

	/**
	 * Sets the title of this modal.
	 *
	 * @param title - The title to use
	 */
	public setTitle(title: string) {
		this.data.title = titleValidator.parse(title);
		return this;
	}

	/**
	 * Sets the custom id of this modal.
	 *
	 * @param customId - The custom id to use
	 */
	public setCustomId(customId: string) {
		this.data.custom_id = customIdValidator.parse(customId);
		return this;
	}

	/**
	 * Adds components to this modal.
	 *
	 * @param components - The components to add
	 */
	public addComponents(
		...components: RestOrArray<
			ActionRowBuilder<ModalActionRowComponentBuilder> | APIActionRowComponent<APIModalActionRowComponent>
		>
	) {
		this.components.push(
			...normalizeArray(components).map((component) =>
				component instanceof ActionRowBuilder
					? component
					: new ActionRowBuilder<ModalActionRowComponentBuilder>(component),
			),
		);
		return this;
	}

	/**
	 * Sets components for this modal.
	 *
	 * @param components - The components to set
	 */
	public setComponents(...components: RestOrArray<ActionRowBuilder<ModalActionRowComponentBuilder>>) {
		this.components.splice(0, this.components.length, ...normalizeArray(components));
		return this;
	}

	/**
	 * {@inheritDoc ComponentBuilder.toJSON}
	 */
	public toJSON(): APIModalInteractionResponseCallbackData {
		validateRequiredParameters(this.data.custom_id, this.data.title, this.components);

		return {
			...this.data,
			components: this.components.map((component) => component.toJSON()),
		} as APIModalInteractionResponseCallbackData;
	}
}

```

# packages\builders\src\interactions\slashCommands\Assertions.ts

```ts
import { s } from '@sapphire/shapeshift';
import {
	ApplicationIntegrationType,
	InteractionContextType,
	Locale,
	type APIApplicationCommandOptionChoice,
	type LocalizationMap,
} from 'discord-api-types/v10';
import { isValidationEnabled } from '../../util/validation.js';
import type { ToAPIApplicationCommandOptions } from './SlashCommandBuilder.js';
import type { SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder } from './SlashCommandSubcommands.js';
import type { ApplicationCommandOptionBase } from './mixins/ApplicationCommandOptionBase.js';

const namePredicate = s.string
	.lengthGreaterThanOrEqual(1)
	.lengthLessThanOrEqual(32)
	.regex(/^[\p{Ll}\p{Lm}\p{Lo}\p{N}\p{sc=Devanagari}\p{sc=Thai}_-]+$/u)
	.setValidationEnabled(isValidationEnabled);

export function validateName(name: unknown): asserts name is string {
	namePredicate.parse(name);
}

const descriptionPredicate = s.string
	.lengthGreaterThanOrEqual(1)
	.lengthLessThanOrEqual(100)
	.setValidationEnabled(isValidationEnabled);
const localePredicate = s.nativeEnum(Locale);

export function validateDescription(description: unknown): asserts description is string {
	descriptionPredicate.parse(description);
}

const maxArrayLengthPredicate = s.unknown.array.lengthLessThanOrEqual(25).setValidationEnabled(isValidationEnabled);
export function validateLocale(locale: unknown) {
	return localePredicate.parse(locale);
}

export function validateMaxOptionsLength(options: unknown): asserts options is ToAPIApplicationCommandOptions[] {
	maxArrayLengthPredicate.parse(options);
}

export function validateRequiredParameters(
	name: string,
	description: string,
	options: ToAPIApplicationCommandOptions[],
) {
	// Assert name matches all conditions
	validateName(name);

	// Assert description conditions
	validateDescription(description);

	// Assert options conditions
	validateMaxOptionsLength(options);
}

const booleanPredicate = s.boolean;

export function validateDefaultPermission(value: unknown): asserts value is boolean {
	booleanPredicate.parse(value);
}

export function validateRequired(required: unknown): asserts required is boolean {
	booleanPredicate.parse(required);
}

const choicesLengthPredicate = s.number.lessThanOrEqual(25).setValidationEnabled(isValidationEnabled);

export function validateChoicesLength(amountAdding: number, choices?: APIApplicationCommandOptionChoice[]): void {
	choicesLengthPredicate.parse((choices?.length ?? 0) + amountAdding);
}

export function assertReturnOfBuilder<
	ReturnType extends ApplicationCommandOptionBase | SlashCommandSubcommandBuilder | SlashCommandSubcommandGroupBuilder,
>(input: unknown, ExpectedInstanceOf: new () => ReturnType): asserts input is ReturnType {
	s.instance(ExpectedInstanceOf).parse(input);
}

export const localizationMapPredicate = s
	.object<LocalizationMap>(Object.fromEntries(Object.values(Locale).map((locale) => [locale, s.string.nullish])))
	.strict.nullish.setValidationEnabled(isValidationEnabled);

export function validateLocalizationMap(value: unknown): asserts value is LocalizationMap {
	localizationMapPredicate.parse(value);
}

const dmPermissionPredicate = s.boolean.nullish;

export function validateDMPermission(value: unknown): asserts value is boolean | null | undefined {
	dmPermissionPredicate.parse(value);
}

const memberPermissionPredicate = s.union(
	s.bigint.transform((value) => value.toString()),
	s.number.safeInt.transform((value) => value.toString()),
	s.string.regex(/^\d+$/),
).nullish;

export function validateDefaultMemberPermissions(permissions: unknown) {
	return memberPermissionPredicate.parse(permissions);
}

export function validateNSFW(value: unknown): asserts value is boolean {
	booleanPredicate.parse(value);
}

export const contextsPredicate = s.array(
	s.nativeEnum(InteractionContextType).setValidationEnabled(isValidationEnabled),
);

export const integrationTypesPredicate = s.array(
	s.nativeEnum(ApplicationIntegrationType).setValidationEnabled(isValidationEnabled),
);

```

# packages\builders\src\interactions\slashCommands\mixins\ApplicationCommandNumericOptionMinMaxValueMixin.ts

```ts
/**
 * This mixin holds minimum and maximum symbols used for options.
 */
export abstract class ApplicationCommandNumericOptionMinMaxValueMixin {
	/**
	 * The maximum value of this option.
	 */
	public readonly max_value?: number;

	/**
	 * The minimum value of this option.
	 */
	public readonly min_value?: number;

	/**
	 * Sets the maximum number value of this option.
	 *
	 * @param max - The maximum value this option can be
	 */
	public abstract setMaxValue(max: number): this;

	/**
	 * Sets the minimum number value of this option.
	 *
	 * @param min - The minimum value this option can be
	 */
	public abstract setMinValue(min: number): this;
}

```

# packages\builders\src\interactions\slashCommands\mixins\ApplicationCommandOptionBase.ts

```ts
import type { APIApplicationCommandBasicOption, ApplicationCommandOptionType } from 'discord-api-types/v10';
import { validateRequiredParameters, validateRequired, validateLocalizationMap } from '../Assertions.js';
import { SharedNameAndDescription } from './NameAndDescription.js';

/**
 * The base application command option builder that contains common symbols for application command builders.
 */
export abstract class ApplicationCommandOptionBase extends SharedNameAndDescription {
	/**
	 * The type of this option.
	 */
	public abstract readonly type: ApplicationCommandOptionType;

	/**
	 * Whether this option is required.
	 *
	 * @defaultValue `false`
	 */
	public readonly required: boolean = false;

	/**
	 * Sets whether this option is required.
	 *
	 * @param required - Whether this option should be required
	 */
	public setRequired(required: boolean) {
		// Assert that you actually passed a boolean
		validateRequired(required);

		Reflect.set(this, 'required', required);

		return this;
	}

	/**
	 * Serializes this builder to API-compatible JSON data.
	 *
	 * @remarks
	 * This method runs validations on the data before serializing it.
	 * As such, it may throw an error if the data is invalid.
	 */
	public abstract toJSON(): APIApplicationCommandBasicOption;

	/**
	 * This method runs required validators on this builder.
	 */
	protected runRequiredValidations() {
		validateRequiredParameters(this.name, this.description, []);

		// Validate localizations
		validateLocalizationMap(this.name_localizations);
		validateLocalizationMap(this.description_localizations);

		// Assert that you actually passed a boolean
		validateRequired(this.required);
	}
}

```

# packages\builders\src\interactions\slashCommands\mixins\ApplicationCommandOptionChannelTypesMixin.ts

```ts
import { s } from '@sapphire/shapeshift';
import { ChannelType } from 'discord-api-types/v10';
import { normalizeArray, type RestOrArray } from '../../../util/normalizeArray';

/**
 * The allowed channel types used for a channel option in a slash command builder.
 *
 * @privateRemarks This can't be dynamic because const enums are erased at runtime.
 * @internal
 */
const allowedChannelTypes = [
	ChannelType.GuildText,
	ChannelType.GuildVoice,
	ChannelType.GuildCategory,
	ChannelType.GuildAnnouncement,
	ChannelType.AnnouncementThread,
	ChannelType.PublicThread,
	ChannelType.PrivateThread,
	ChannelType.GuildStageVoice,
	ChannelType.GuildForum,
	ChannelType.GuildMedia,
] as const;

/**
 * The type of allowed channel types used for a channel option.
 */
export type ApplicationCommandOptionAllowedChannelTypes = (typeof allowedChannelTypes)[number];

const channelTypesPredicate = s.array(s.union(...allowedChannelTypes.map((type) => s.literal(type))));

/**
 * This mixin holds channel type symbols used for options.
 */
export class ApplicationCommandOptionChannelTypesMixin {
	/**
	 * The channel types of this option.
	 */
	public readonly channel_types?: ApplicationCommandOptionAllowedChannelTypes[];

	/**
	 * Adds channel types to this option.
	 *
	 * @param channelTypes - The channel types
	 */
	public addChannelTypes(...channelTypes: RestOrArray<ApplicationCommandOptionAllowedChannelTypes>) {
		if (this.channel_types === undefined) {
			Reflect.set(this, 'channel_types', []);
		}

		this.channel_types!.push(...channelTypesPredicate.parse(normalizeArray(channelTypes)));

		return this;
	}
}

```

# packages\builders\src\interactions\slashCommands\mixins\ApplicationCommandOptionWithAutocompleteMixin.ts

```ts
import { s } from '@sapphire/shapeshift';
import type { ApplicationCommandOptionType } from 'discord-api-types/v10';

const booleanPredicate = s.boolean;

/**
 * This mixin holds choices and autocomplete symbols used for options.
 */
export class ApplicationCommandOptionWithAutocompleteMixin {
	/**
	 * Whether this option utilizes autocomplete.
	 */
	public readonly autocomplete?: boolean;

	/**
	 * The type of this option.
	 *
	 * @privateRemarks Since this is present and this is a mixin, this is needed.
	 */
	public readonly type!: ApplicationCommandOptionType;

	/**
	 * Whether this option uses autocomplete.
	 *
	 * @param autocomplete - Whether this option should use autocomplete
	 */
	public setAutocomplete(autocomplete: boolean): this {
		// Assert that you actually passed a boolean
		booleanPredicate.parse(autocomplete);

		if (autocomplete && 'choices' in this && Array.isArray(this.choices) && this.choices.length > 0) {
			throw new RangeError('Autocomplete and choices are mutually exclusive to each other.');
		}

		Reflect.set(this, 'autocomplete', autocomplete);

		return this;
	}
}

```

# packages\builders\src\interactions\slashCommands\mixins\ApplicationCommandOptionWithChoicesMixin.ts

```ts
import { s } from '@sapphire/shapeshift';
import { ApplicationCommandOptionType, type APIApplicationCommandOptionChoice } from 'discord-api-types/v10';
import { normalizeArray, type RestOrArray } from '../../../util/normalizeArray.js';
import { localizationMapPredicate, validateChoicesLength } from '../Assertions.js';

const stringPredicate = s.string.lengthGreaterThanOrEqual(1).lengthLessThanOrEqual(100);
const numberPredicate = s.number.greaterThan(Number.NEGATIVE_INFINITY).lessThan(Number.POSITIVE_INFINITY);
const choicesPredicate = s.object({
	name: stringPredicate,
	name_localizations: localizationMapPredicate,
	value: s.union(stringPredicate, numberPredicate),
}).array;

/**
 * This mixin holds choices and autocomplete symbols used for options.
 */
export class ApplicationCommandOptionWithChoicesMixin<ChoiceType extends number | string> {
	/**
	 * The choices of this option.
	 */
	public readonly choices?: APIApplicationCommandOptionChoice<ChoiceType>[];

	/**
	 * The type of this option.
	 *
	 * @privateRemarks Since this is present and this is a mixin, this is needed.
	 */
	public readonly type!: ApplicationCommandOptionType;

	/**
	 * Adds multiple choices to this option.
	 *
	 * @param choices - The choices to add
	 */
	public addChoices(...choices: RestOrArray<APIApplicationCommandOptionChoice<ChoiceType>>): this {
		const normalizedChoices = normalizeArray(choices);
		if (normalizedChoices.length > 0 && 'autocomplete' in this && this.autocomplete) {
			throw new RangeError('Autocomplete and choices are mutually exclusive to each other.');
		}

		choicesPredicate.parse(normalizedChoices);

		if (this.choices === undefined) {
			Reflect.set(this, 'choices', []);
		}

		validateChoicesLength(normalizedChoices.length, this.choices);

		for (const { name, name_localizations, value } of normalizedChoices) {
			// Validate the value
			if (this.type === ApplicationCommandOptionType.String) {
				stringPredicate.parse(value);
			} else {
				numberPredicate.parse(value);
			}

			this.choices!.push({ name, name_localizations, value });
		}

		return this;
	}

	/**
	 * Sets multiple choices for this option.
	 *
	 * @param choices - The choices to set
	 */
	public setChoices<Input extends APIApplicationCommandOptionChoice<ChoiceType>>(...choices: RestOrArray<Input>): this {
		const normalizedChoices = normalizeArray(choices);
		if (normalizedChoices.length > 0 && 'autocomplete' in this && this.autocomplete) {
			throw new RangeError('Autocomplete and choices are mutually exclusive to each other.');
		}

		choicesPredicate.parse(normalizedChoices);

		Reflect.set(this, 'choices', []);
		this.addChoices(normalizedChoices);

		return this;
	}
}

```

# packages\builders\src\interactions\slashCommands\mixins\NameAndDescription.ts

```ts
import type { LocaleString, LocalizationMap } from 'discord-api-types/v10';
import { validateDescription, validateLocale, validateName } from '../Assertions.js';

/**
 * This mixin holds name and description symbols for slash commands.
 */
export class SharedNameAndDescription {
	/**
	 * The name of this command.
	 */
	public readonly name!: string;

	/**
	 * The name localizations of this command.
	 */
	public readonly name_localizations?: LocalizationMap;

	/**
	 * The description of this command.
	 */
	public readonly description!: string;

	/**
	 * The description localizations of this command.
	 */
	public readonly description_localizations?: LocalizationMap;

	/**
	 * Sets the name of this command.
	 *
	 * @param name - The name to use
	 */
	public setName(name: string): this {
		// Assert the name matches the conditions
		validateName(name);

		Reflect.set(this, 'name', name);

		return this;
	}

	/**
	 * Sets the description of this command.
	 *
	 * @param description - The description to use
	 */
	public setDescription(description: string) {
		// Assert the description matches the conditions
		validateDescription(description);

		Reflect.set(this, 'description', description);

		return this;
	}

	/**
	 * Sets a name localization for this command.
	 *
	 * @param locale - The locale to set
	 * @param localizedName - The localized name for the given `locale`
	 */
	public setNameLocalization(locale: LocaleString, localizedName: string | null) {
		if (!this.name_localizations) {
			Reflect.set(this, 'name_localizations', {});
		}

		const parsedLocale = validateLocale(locale);

		if (localizedName === null) {
			this.name_localizations![parsedLocale] = null;
			return this;
		}

		validateName(localizedName);

		this.name_localizations![parsedLocale] = localizedName;
		return this;
	}

	/**
	 * Sets the name localizations for this command.
	 *
	 * @param localizedNames - The object of localized names to set
	 */
	public setNameLocalizations(localizedNames: LocalizationMap | null) {
		if (localizedNames === null) {
			Reflect.set(this, 'name_localizations', null);
			return this;
		}

		Reflect.set(this, 'name_localizations', {});

		for (const args of Object.entries(localizedNames)) {
			this.setNameLocalization(...(args as [LocaleString, string | null]));
		}

		return this;
	}

	/**
	 * Sets a description localization for this command.
	 *
	 * @param locale - The locale to set
	 * @param localizedDescription - The localized description for the given locale
	 */
	public setDescriptionLocalization(locale: LocaleString, localizedDescription: string | null) {
		if (!this.description_localizations) {
			Reflect.set(this, 'description_localizations', {});
		}

		const parsedLocale = validateLocale(locale);

		if (localizedDescription === null) {
			this.description_localizations![parsedLocale] = null;
			return this;
		}

		validateDescription(localizedDescription);

		this.description_localizations![parsedLocale] = localizedDescription;
		return this;
	}

	/**
	 * Sets the description localizations for this command.
	 *
	 * @param localizedDescriptions - The object of localized descriptions to set
	 */
	public setDescriptionLocalizations(localizedDescriptions: LocalizationMap | null) {
		if (localizedDescriptions === null) {
			Reflect.set(this, 'description_localizations', null);
			return this;
		}

		Reflect.set(this, 'description_localizations', {});
		for (const args of Object.entries(localizedDescriptions)) {
			this.setDescriptionLocalization(...(args as [LocaleString, string | null]));
		}

		return this;
	}
}

```

# packages\builders\src\interactions\slashCommands\mixins\SharedSlashCommand.ts

```ts
import type {
	ApplicationIntegrationType,
	InteractionContextType,
	LocalizationMap,
	Permissions,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import type { RestOrArray } from '../../../util/normalizeArray.js';
import { normalizeArray } from '../../../util/normalizeArray.js';
import {
	contextsPredicate,
	integrationTypesPredicate,
	validateDMPermission,
	validateDefaultMemberPermissions,
	validateDefaultPermission,
	validateLocalizationMap,
	validateNSFW,
	validateRequiredParameters,
} from '../Assertions.js';
import type { ToAPIApplicationCommandOptions } from '../SlashCommandBuilder.js';

/**
 * This mixin holds symbols that can be shared in slashcommands independent of options or subcommands.
 */
export class SharedSlashCommand {
	public readonly name: string = undefined!;

	public readonly name_localizations?: LocalizationMap;

	public readonly description: string = undefined!;

	public readonly description_localizations?: LocalizationMap;

	public readonly options: ToAPIApplicationCommandOptions[] = [];

	public readonly contexts?: InteractionContextType[];

	/**
	 * @deprecated Use {@link SharedSlashCommand.setDefaultMemberPermissions} or {@link SharedSlashCommand.setDMPermission} instead.
	 */
	public readonly default_permission: boolean | undefined = undefined;

	public readonly default_member_permissions: Permissions | null | undefined = undefined;

	public readonly dm_permission: boolean | undefined = undefined;

	public readonly integration_types?: ApplicationIntegrationType[];

	public readonly nsfw: boolean | undefined = undefined;

	/**
	 * Sets the contexts of this command.
	 *
	 * @param contexts - The contexts
	 */
	public setContexts(...contexts: RestOrArray<InteractionContextType>) {
		Reflect.set(this, 'contexts', contextsPredicate.parse(normalizeArray(contexts)));

		return this;
	}

	/**
	 * Sets the integration types of this command.
	 *
	 * @param integrationTypes - The integration types
	 */
	public setIntegrationTypes(...integrationTypes: RestOrArray<ApplicationIntegrationType>) {
		Reflect.set(this, 'integration_types', integrationTypesPredicate.parse(normalizeArray(integrationTypes)));

		return this;
	}

	/**
	 * Sets whether the command is enabled by default when the application is added to a guild.
	 *
	 * @remarks
	 * If set to `false`, you will have to later `PUT` the permissions for this command.
	 * @param value - Whether or not to enable this command by default
	 * @see {@link https://discord.com/developers/docs/interactions/application-commands#permissions}
	 * @deprecated Use {@link SharedSlashCommand.setDefaultMemberPermissions} or {@link SharedSlashCommand.setDMPermission} instead.
	 */
	public setDefaultPermission(value: boolean) {
		// Assert the value matches the conditions
		validateDefaultPermission(value);

		Reflect.set(this, 'default_permission', value);

		return this;
	}

	/**
	 * Sets the default permissions a member should have in order to run the command.
	 *
	 * @remarks
	 * You can set this to `'0'` to disable the command by default.
	 * @param permissions - The permissions bit field to set
	 * @see {@link https://discord.com/developers/docs/interactions/application-commands#permissions}
	 */
	public setDefaultMemberPermissions(permissions: Permissions | bigint | number | null | undefined) {
		// Assert the value and parse it
		const permissionValue = validateDefaultMemberPermissions(permissions);

		Reflect.set(this, 'default_member_permissions', permissionValue);

		return this;
	}

	/**
	 * Sets if the command is available in direct messages with the application.
	 *
	 * @remarks
	 * By default, commands are visible. This method is only for global commands.
	 * @param enabled - Whether the command should be enabled in direct messages
	 * @see {@link https://discord.com/developers/docs/interactions/application-commands#permissions}
	 */
	public setDMPermission(enabled: boolean | null | undefined) {
		// Assert the value matches the conditions
		validateDMPermission(enabled);

		Reflect.set(this, 'dm_permission', enabled);

		return this;
	}

	/**
	 * Sets whether this command is NSFW.
	 *
	 * @param nsfw - Whether this command is NSFW
	 */
	public setNSFW(nsfw = true) {
		// Assert the value matches the conditions
		validateNSFW(nsfw);
		Reflect.set(this, 'nsfw', nsfw);
		return this;
	}

	/**
	 * Serializes this builder to API-compatible JSON data.
	 *
	 * @remarks
	 * This method runs validations on the data before serializing it.
	 * As such, it may throw an error if the data is invalid.
	 */
	public toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody {
		validateRequiredParameters(this.name, this.description, this.options);

		validateLocalizationMap(this.name_localizations);
		validateLocalizationMap(this.description_localizations);

		return {
			...this,
			options: this.options.map((option) => option.toJSON()),
		};
	}
}

```

# packages\builders\src\interactions\slashCommands\mixins\SharedSlashCommandOptions.ts

```ts
import { assertReturnOfBuilder, validateMaxOptionsLength } from '../Assertions.js';
import type { ToAPIApplicationCommandOptions } from '../SlashCommandBuilder';
import { SlashCommandAttachmentOption } from '../options/attachment.js';
import { SlashCommandBooleanOption } from '../options/boolean.js';
import { SlashCommandChannelOption } from '../options/channel.js';
import { SlashCommandIntegerOption } from '../options/integer.js';
import { SlashCommandMentionableOption } from '../options/mentionable.js';
import { SlashCommandNumberOption } from '../options/number.js';
import { SlashCommandRoleOption } from '../options/role.js';
import { SlashCommandStringOption } from '../options/string.js';
import { SlashCommandUserOption } from '../options/user.js';
import type { ApplicationCommandOptionBase } from './ApplicationCommandOptionBase.js';

/**
 * This mixin holds symbols that can be shared in slash command options.
 *
 * @typeParam TypeAfterAddingOptions - The type this class should return after adding an option.
 */
export class SharedSlashCommandOptions<
	TypeAfterAddingOptions extends SharedSlashCommandOptions<TypeAfterAddingOptions>,
> {
	public readonly options!: ToAPIApplicationCommandOptions[];

	/**
	 * Adds a boolean option.
	 *
	 * @param input - A function that returns an option builder or an already built builder
	 */
	public addBooleanOption(
		input: SlashCommandBooleanOption | ((builder: SlashCommandBooleanOption) => SlashCommandBooleanOption),
	) {
		return this._sharedAddOptionMethod(input, SlashCommandBooleanOption);
	}

	/**
	 * Adds a user option.
	 *
	 * @param input - A function that returns an option builder or an already built builder
	 */
	public addUserOption(input: SlashCommandUserOption | ((builder: SlashCommandUserOption) => SlashCommandUserOption)) {
		return this._sharedAddOptionMethod(input, SlashCommandUserOption);
	}

	/**
	 * Adds a channel option.
	 *
	 * @param input - A function that returns an option builder or an already built builder
	 */
	public addChannelOption(
		input: SlashCommandChannelOption | ((builder: SlashCommandChannelOption) => SlashCommandChannelOption),
	) {
		return this._sharedAddOptionMethod(input, SlashCommandChannelOption);
	}

	/**
	 * Adds a role option.
	 *
	 * @param input - A function that returns an option builder or an already built builder
	 */
	public addRoleOption(input: SlashCommandRoleOption | ((builder: SlashCommandRoleOption) => SlashCommandRoleOption)) {
		return this._sharedAddOptionMethod(input, SlashCommandRoleOption);
	}

	/**
	 * Adds an attachment option.
	 *
	 * @param input - A function that returns an option builder or an already built builder
	 */
	public addAttachmentOption(
		input: SlashCommandAttachmentOption | ((builder: SlashCommandAttachmentOption) => SlashCommandAttachmentOption),
	) {
		return this._sharedAddOptionMethod(input, SlashCommandAttachmentOption);
	}

	/**
	 * Adds a mentionable option.
	 *
	 * @param input - A function that returns an option builder or an already built builder
	 */
	public addMentionableOption(
		input: SlashCommandMentionableOption | ((builder: SlashCommandMentionableOption) => SlashCommandMentionableOption),
	) {
		return this._sharedAddOptionMethod(input, SlashCommandMentionableOption);
	}

	/**
	 * Adds a string option.
	 *
	 * @param input - A function that returns an option builder or an already built builder
	 */
	public addStringOption(
		input: SlashCommandStringOption | ((builder: SlashCommandStringOption) => SlashCommandStringOption),
	) {
		return this._sharedAddOptionMethod(input, SlashCommandStringOption);
	}

	/**
	 * Adds an integer option.
	 *
	 * @param input - A function that returns an option builder or an already built builder
	 */
	public addIntegerOption(
		input: SlashCommandIntegerOption | ((builder: SlashCommandIntegerOption) => SlashCommandIntegerOption),
	) {
		return this._sharedAddOptionMethod(input, SlashCommandIntegerOption);
	}

	/**
	 * Adds a number option.
	 *
	 * @param input - A function that returns an option builder or an already built builder
	 */
	public addNumberOption(
		input: SlashCommandNumberOption | ((builder: SlashCommandNumberOption) => SlashCommandNumberOption),
	) {
		return this._sharedAddOptionMethod(input, SlashCommandNumberOption);
	}

	/**
	 * Where the actual adding magic happens. ✨
	 *
	 * @param input - The input. What else?
	 * @param Instance - The instance of whatever is being added
	 * @internal
	 */
	private _sharedAddOptionMethod<OptionBuilder extends ApplicationCommandOptionBase>(
		input: OptionBuilder | ((builder: OptionBuilder) => OptionBuilder),
		Instance: new () => OptionBuilder,
	): TypeAfterAddingOptions {
		const { options } = this;

		// First, assert options conditions - we cannot have more than 25 options
		validateMaxOptionsLength(options);

		// Get the final result
		const result = typeof input === 'function' ? input(new Instance()) : input;

		assertReturnOfBuilder(result, Instance);

		// Push it
		options.push(result);

		return this as unknown as TypeAfterAddingOptions;
	}
}

```

# packages\builders\src\interactions\slashCommands\mixins\SharedSubcommands.ts

```ts
import { assertReturnOfBuilder, validateMaxOptionsLength } from '../Assertions.js';
import type { ToAPIApplicationCommandOptions } from '../SlashCommandBuilder.js';
import { SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder } from '../SlashCommandSubcommands.js';

/**
 * This mixin holds symbols that can be shared in slash subcommands.
 *
 * @typeParam TypeAfterAddingSubcommands - The type this class should return after adding a subcommand or subcommand group.
 */
export class SharedSlashCommandSubcommands<
	TypeAfterAddingSubcommands extends SharedSlashCommandSubcommands<TypeAfterAddingSubcommands>,
> {
	public readonly options: ToAPIApplicationCommandOptions[] = [];

	/**
	 * Adds a new subcommand group to this command.
	 *
	 * @param input - A function that returns a subcommand group builder or an already built builder
	 */
	public addSubcommandGroup(
		input:
			| SlashCommandSubcommandGroupBuilder
			| ((subcommandGroup: SlashCommandSubcommandGroupBuilder) => SlashCommandSubcommandGroupBuilder),
	): TypeAfterAddingSubcommands {
		const { options } = this;

		// First, assert options conditions - we cannot have more than 25 options
		validateMaxOptionsLength(options);

		// Get the final result
		const result = typeof input === 'function' ? input(new SlashCommandSubcommandGroupBuilder()) : input;

		assertReturnOfBuilder(result, SlashCommandSubcommandGroupBuilder);

		// Push it
		options.push(result);

		return this as unknown as TypeAfterAddingSubcommands;
	}

	/**
	 * Adds a new subcommand to this command.
	 *
	 * @param input - A function that returns a subcommand builder or an already built builder
	 */
	public addSubcommand(
		input:
			| SlashCommandSubcommandBuilder
			| ((subcommandGroup: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder),
	): TypeAfterAddingSubcommands {
		const { options } = this;

		// First, assert options conditions - we cannot have more than 25 options
		validateMaxOptionsLength(options);

		// Get the final result
		const result = typeof input === 'function' ? input(new SlashCommandSubcommandBuilder()) : input;

		assertReturnOfBuilder(result, SlashCommandSubcommandBuilder);

		// Push it
		options.push(result);

		return this as unknown as TypeAfterAddingSubcommands;
	}
}

```

# packages\builders\src\interactions\slashCommands\options\attachment.ts

```ts
import { ApplicationCommandOptionType, type APIApplicationCommandAttachmentOption } from 'discord-api-types/v10';
import { ApplicationCommandOptionBase } from '../mixins/ApplicationCommandOptionBase.js';

/**
 * A slash command attachment option.
 */
export class SlashCommandAttachmentOption extends ApplicationCommandOptionBase {
	/**
	 * The type of this option.
	 */
	public override readonly type = ApplicationCommandOptionType.Attachment as const;

	/**
	 * {@inheritDoc ApplicationCommandOptionBase.toJSON}
	 */
	public toJSON(): APIApplicationCommandAttachmentOption {
		this.runRequiredValidations();

		return { ...this };
	}
}

```

# packages\builders\src\interactions\slashCommands\options\boolean.ts

```ts
import { ApplicationCommandOptionType, type APIApplicationCommandBooleanOption } from 'discord-api-types/v10';
import { ApplicationCommandOptionBase } from '../mixins/ApplicationCommandOptionBase.js';

/**
 * A slash command boolean option.
 */
export class SlashCommandBooleanOption extends ApplicationCommandOptionBase {
	/**
	 * The type of this option.
	 */
	public readonly type = ApplicationCommandOptionType.Boolean as const;

	/**
	 * {@inheritDoc ApplicationCommandOptionBase.toJSON}
	 */
	public toJSON(): APIApplicationCommandBooleanOption {
		this.runRequiredValidations();

		return { ...this };
	}
}

```

# packages\builders\src\interactions\slashCommands\options\channel.ts

```ts
import { ApplicationCommandOptionType, type APIApplicationCommandChannelOption } from 'discord-api-types/v10';
import { mix } from 'ts-mixer';
import { ApplicationCommandOptionBase } from '../mixins/ApplicationCommandOptionBase.js';
import { ApplicationCommandOptionChannelTypesMixin } from '../mixins/ApplicationCommandOptionChannelTypesMixin.js';

/**
 * A slash command channel option.
 */
@mix(ApplicationCommandOptionChannelTypesMixin)
export class SlashCommandChannelOption extends ApplicationCommandOptionBase {
	/**
	 * The type of this option.
	 */
	public override readonly type = ApplicationCommandOptionType.Channel as const;

	/**
	 * {@inheritDoc ApplicationCommandOptionBase.toJSON}
	 */
	public toJSON(): APIApplicationCommandChannelOption {
		this.runRequiredValidations();

		return { ...this };
	}
}

export interface SlashCommandChannelOption extends ApplicationCommandOptionChannelTypesMixin {}

```

# packages\builders\src\interactions\slashCommands\options\integer.ts

```ts
import { s } from '@sapphire/shapeshift';
import { ApplicationCommandOptionType, type APIApplicationCommandIntegerOption } from 'discord-api-types/v10';
import { mix } from 'ts-mixer';
import { ApplicationCommandNumericOptionMinMaxValueMixin } from '../mixins/ApplicationCommandNumericOptionMinMaxValueMixin.js';
import { ApplicationCommandOptionBase } from '../mixins/ApplicationCommandOptionBase.js';
import { ApplicationCommandOptionWithAutocompleteMixin } from '../mixins/ApplicationCommandOptionWithAutocompleteMixin.js';
import { ApplicationCommandOptionWithChoicesMixin } from '../mixins/ApplicationCommandOptionWithChoicesMixin.js';

const numberValidator = s.number.int;

/**
 * A slash command integer option.
 */
@mix(
	ApplicationCommandNumericOptionMinMaxValueMixin,
	ApplicationCommandOptionWithAutocompleteMixin,
	ApplicationCommandOptionWithChoicesMixin,
)
export class SlashCommandIntegerOption
	extends ApplicationCommandOptionBase
	implements ApplicationCommandNumericOptionMinMaxValueMixin
{
	/**
	 * The type of this option.
	 */
	public readonly type = ApplicationCommandOptionType.Integer as const;

	/**
	 * {@inheritDoc ApplicationCommandNumericOptionMinMaxValueMixin.setMaxValue}
	 */
	public setMaxValue(max: number): this {
		numberValidator.parse(max);

		Reflect.set(this, 'max_value', max);

		return this;
	}

	/**
	 * {@inheritDoc ApplicationCommandNumericOptionMinMaxValueMixin.setMinValue}
	 */
	public setMinValue(min: number): this {
		numberValidator.parse(min);

		Reflect.set(this, 'min_value', min);

		return this;
	}

	/**
	 * {@inheritDoc ApplicationCommandOptionBase.toJSON}
	 */
	public toJSON(): APIApplicationCommandIntegerOption {
		this.runRequiredValidations();

		if (this.autocomplete && Array.isArray(this.choices) && this.choices.length > 0) {
			throw new RangeError('Autocomplete and choices are mutually exclusive to each other.');
		}

		return { ...this } as APIApplicationCommandIntegerOption;
	}
}

export interface SlashCommandIntegerOption
	extends ApplicationCommandNumericOptionMinMaxValueMixin,
		ApplicationCommandOptionWithChoicesMixin<number>,
		ApplicationCommandOptionWithAutocompleteMixin {}

```

# packages\builders\src\interactions\slashCommands\options\mentionable.ts

```ts
import { ApplicationCommandOptionType, type APIApplicationCommandMentionableOption } from 'discord-api-types/v10';
import { ApplicationCommandOptionBase } from '../mixins/ApplicationCommandOptionBase.js';

/**
 * A slash command mentionable option.
 */
export class SlashCommandMentionableOption extends ApplicationCommandOptionBase {
	/**
	 * The type of this option.
	 */
	public readonly type = ApplicationCommandOptionType.Mentionable as const;

	/**
	 * {@inheritDoc ApplicationCommandOptionBase.toJSON}
	 */
	public toJSON(): APIApplicationCommandMentionableOption {
		this.runRequiredValidations();

		return { ...this };
	}
}

```

# packages\builders\src\interactions\slashCommands\options\number.ts

```ts
import { s } from '@sapphire/shapeshift';
import { ApplicationCommandOptionType, type APIApplicationCommandNumberOption } from 'discord-api-types/v10';
import { mix } from 'ts-mixer';
import { ApplicationCommandNumericOptionMinMaxValueMixin } from '../mixins/ApplicationCommandNumericOptionMinMaxValueMixin.js';
import { ApplicationCommandOptionBase } from '../mixins/ApplicationCommandOptionBase.js';
import { ApplicationCommandOptionWithAutocompleteMixin } from '../mixins/ApplicationCommandOptionWithAutocompleteMixin.js';
import { ApplicationCommandOptionWithChoicesMixin } from '../mixins/ApplicationCommandOptionWithChoicesMixin.js';

const numberValidator = s.number;

/**
 * A slash command number option.
 */
@mix(
	ApplicationCommandNumericOptionMinMaxValueMixin,
	ApplicationCommandOptionWithAutocompleteMixin,
	ApplicationCommandOptionWithChoicesMixin,
)
export class SlashCommandNumberOption
	extends ApplicationCommandOptionBase
	implements ApplicationCommandNumericOptionMinMaxValueMixin
{
	/**
	 * The type of this option.
	 */
	public readonly type = ApplicationCommandOptionType.Number as const;

	/**
	 * {@inheritDoc ApplicationCommandNumericOptionMinMaxValueMixin.setMaxValue}
	 */
	public setMaxValue(max: number): this {
		numberValidator.parse(max);

		Reflect.set(this, 'max_value', max);

		return this;
	}

	/**
	 * {@inheritDoc ApplicationCommandNumericOptionMinMaxValueMixin.setMinValue}
	 */
	public setMinValue(min: number): this {
		numberValidator.parse(min);

		Reflect.set(this, 'min_value', min);

		return this;
	}

	/**
	 * {@inheritDoc ApplicationCommandOptionBase.toJSON}
	 */
	public toJSON(): APIApplicationCommandNumberOption {
		this.runRequiredValidations();

		if (this.autocomplete && Array.isArray(this.choices) && this.choices.length > 0) {
			throw new RangeError('Autocomplete and choices are mutually exclusive to each other.');
		}

		return { ...this } as APIApplicationCommandNumberOption;
	}
}

export interface SlashCommandNumberOption
	extends ApplicationCommandNumericOptionMinMaxValueMixin,
		ApplicationCommandOptionWithChoicesMixin<number>,
		ApplicationCommandOptionWithAutocompleteMixin {}

```

# packages\builders\src\interactions\slashCommands\options\role.ts

```ts
import { ApplicationCommandOptionType, type APIApplicationCommandRoleOption } from 'discord-api-types/v10';
import { ApplicationCommandOptionBase } from '../mixins/ApplicationCommandOptionBase.js';

/**
 * A slash command role option.
 */
export class SlashCommandRoleOption extends ApplicationCommandOptionBase {
	/**
	 * The type of this option.
	 */
	public override readonly type = ApplicationCommandOptionType.Role as const;

	/**
	 * {@inheritDoc ApplicationCommandOptionBase.toJSON}
	 */
	public toJSON(): APIApplicationCommandRoleOption {
		this.runRequiredValidations();

		return { ...this };
	}
}

```

# packages\builders\src\interactions\slashCommands\options\string.ts

```ts
import { s } from '@sapphire/shapeshift';
import { ApplicationCommandOptionType, type APIApplicationCommandStringOption } from 'discord-api-types/v10';
import { mix } from 'ts-mixer';
import { ApplicationCommandOptionBase } from '../mixins/ApplicationCommandOptionBase.js';
import { ApplicationCommandOptionWithAutocompleteMixin } from '../mixins/ApplicationCommandOptionWithAutocompleteMixin.js';
import { ApplicationCommandOptionWithChoicesMixin } from '../mixins/ApplicationCommandOptionWithChoicesMixin.js';

const minLengthValidator = s.number.greaterThanOrEqual(0).lessThanOrEqual(6_000);
const maxLengthValidator = s.number.greaterThanOrEqual(1).lessThanOrEqual(6_000);

/**
 * A slash command string option.
 */
@mix(ApplicationCommandOptionWithAutocompleteMixin, ApplicationCommandOptionWithChoicesMixin)
export class SlashCommandStringOption extends ApplicationCommandOptionBase {
	/**
	 * The type of this option.
	 */
	public readonly type = ApplicationCommandOptionType.String as const;

	/**
	 * The maximum length of this option.
	 */
	public readonly max_length?: number;

	/**
	 * The minimum length of this option.
	 */
	public readonly min_length?: number;

	/**
	 * Sets the maximum length of this string option.
	 *
	 * @param max - The maximum length this option can be
	 */
	public setMaxLength(max: number): this {
		maxLengthValidator.parse(max);

		Reflect.set(this, 'max_length', max);

		return this;
	}

	/**
	 * Sets the minimum length of this string option.
	 *
	 * @param min - The minimum length this option can be
	 */
	public setMinLength(min: number): this {
		minLengthValidator.parse(min);

		Reflect.set(this, 'min_length', min);

		return this;
	}

	/**
	 * {@inheritDoc ApplicationCommandOptionBase.toJSON}
	 */
	public toJSON(): APIApplicationCommandStringOption {
		this.runRequiredValidations();

		if (this.autocomplete && Array.isArray(this.choices) && this.choices.length > 0) {
			throw new RangeError('Autocomplete and choices are mutually exclusive to each other.');
		}

		return { ...this } as APIApplicationCommandStringOption;
	}
}

export interface SlashCommandStringOption
	extends ApplicationCommandOptionWithChoicesMixin<string>,
		ApplicationCommandOptionWithAutocompleteMixin {}

```

# packages\builders\src\interactions\slashCommands\options\user.ts

```ts
import { ApplicationCommandOptionType, type APIApplicationCommandUserOption } from 'discord-api-types/v10';
import { ApplicationCommandOptionBase } from '../mixins/ApplicationCommandOptionBase.js';

/**
 * A slash command user option.
 */
export class SlashCommandUserOption extends ApplicationCommandOptionBase {
	/**
	 * The type of this option.
	 */
	public readonly type = ApplicationCommandOptionType.User as const;

	/**
	 * {@inheritDoc ApplicationCommandOptionBase.toJSON}
	 */
	public toJSON(): APIApplicationCommandUserOption {
		this.runRequiredValidations();

		return { ...this };
	}
}

```

# packages\builders\src\interactions\slashCommands\SlashCommandBuilder.ts

```ts
import type {
	APIApplicationCommandOption,
	ApplicationIntegrationType,
	InteractionContextType,
	LocalizationMap,
	Permissions,
} from 'discord-api-types/v10';
import { mix } from 'ts-mixer';
import { SharedNameAndDescription } from './mixins/NameAndDescription.js';
import { SharedSlashCommand } from './mixins/SharedSlashCommand.js';
import { SharedSlashCommandOptions } from './mixins/SharedSlashCommandOptions.js';
import { SharedSlashCommandSubcommands } from './mixins/SharedSubcommands.js';

/**
 * A builder that creates API-compatible JSON data for slash commands.
 */
@mix(SharedSlashCommandOptions, SharedNameAndDescription, SharedSlashCommandSubcommands, SharedSlashCommand)
export class SlashCommandBuilder {
	/**
	 * The name of this command.
	 */
	public readonly name: string = undefined!;

	/**
	 * The name localizations of this command.
	 */
	public readonly name_localizations?: LocalizationMap;

	/**
	 * The description of this command.
	 */
	public readonly description: string = undefined!;

	/**
	 * The description localizations of this command.
	 */
	public readonly description_localizations?: LocalizationMap;

	/**
	 * The options of this command.
	 */
	public readonly options: ToAPIApplicationCommandOptions[] = [];

	/**
	 * The contexts for this command.
	 */
	public readonly contexts?: InteractionContextType[];

	/**
	 * Whether this command is enabled by default when the application is added to a guild.
	 *
	 * @deprecated Use {@link SharedSlashCommand.setDefaultMemberPermissions} or {@link SharedSlashCommand.setDMPermission} instead.
	 */
	public readonly default_permission: boolean | undefined = undefined;

	/**
	 * The set of permissions represented as a bit set for the command.
	 */
	public readonly default_member_permissions: Permissions | null | undefined = undefined;

	/**
	 * Indicates whether the command is available in direct messages with the application.
	 *
	 * @remarks
	 * By default, commands are visible. This property is only for global commands.
	 */
	public readonly dm_permission: boolean | undefined = undefined;

	/**
	 * The integration types for this command.
	 */
	public readonly integration_types?: ApplicationIntegrationType[];

	/**
	 * Whether this command is NSFW.
	 */
	public readonly nsfw: boolean | undefined = undefined;
}

export interface SlashCommandBuilder
	extends SharedNameAndDescription,
		SharedSlashCommandOptions<SlashCommandOptionsOnlyBuilder>,
		SharedSlashCommandSubcommands<SlashCommandSubcommandsOnlyBuilder>,
		SharedSlashCommand {}

/**
 * An interface specifically for slash command subcommands.
 */
export interface SlashCommandSubcommandsOnlyBuilder
	extends SharedNameAndDescription,
		SharedSlashCommandSubcommands<SlashCommandSubcommandsOnlyBuilder>,
		SharedSlashCommand {}

/**
 * An interface specifically for slash command options.
 */
export interface SlashCommandOptionsOnlyBuilder
	extends SharedNameAndDescription,
		SharedSlashCommandOptions<SlashCommandOptionsOnlyBuilder>,
		SharedSlashCommand {}

/**
 * An interface that ensures the `toJSON()` call will return something
 * that can be serialized into API-compatible data.
 */
export interface ToAPIApplicationCommandOptions {
	toJSON(): APIApplicationCommandOption;
}

```

# packages\builders\src\interactions\slashCommands\SlashCommandSubcommands.ts

```ts
import {
	ApplicationCommandOptionType,
	type APIApplicationCommandSubcommandGroupOption,
	type APIApplicationCommandSubcommandOption,
} from 'discord-api-types/v10';
import { mix } from 'ts-mixer';
import { assertReturnOfBuilder, validateMaxOptionsLength, validateRequiredParameters } from './Assertions.js';
import type { ToAPIApplicationCommandOptions } from './SlashCommandBuilder.js';
import type { ApplicationCommandOptionBase } from './mixins/ApplicationCommandOptionBase.js';
import { SharedNameAndDescription } from './mixins/NameAndDescription.js';
import { SharedSlashCommandOptions } from './mixins/SharedSlashCommandOptions.js';

/**
 * Represents a folder for subcommands.
 *
 * @see {@link https://discord.com/developers/docs/interactions/application-commands#subcommands-and-subcommand-groups}
 */
@mix(SharedNameAndDescription)
export class SlashCommandSubcommandGroupBuilder implements ToAPIApplicationCommandOptions {
	/**
	 * The name of this subcommand group.
	 */
	public readonly name: string = undefined!;

	/**
	 * The description of this subcommand group.
	 */
	public readonly description: string = undefined!;

	/**
	 * The subcommands within this subcommand group.
	 */
	public readonly options: SlashCommandSubcommandBuilder[] = [];

	/**
	 * Adds a new subcommand to this group.
	 *
	 * @param input - A function that returns a subcommand builder or an already built builder
	 */
	public addSubcommand(
		input:
			| SlashCommandSubcommandBuilder
			| ((subcommandGroup: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder),
	) {
		const { options } = this;

		// First, assert options conditions - we cannot have more than 25 options
		validateMaxOptionsLength(options);

		// Get the final result
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		const result = typeof input === 'function' ? input(new SlashCommandSubcommandBuilder()) : input;

		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		assertReturnOfBuilder(result, SlashCommandSubcommandBuilder);

		// Push it
		options.push(result);

		return this;
	}

	/**
	 * Serializes this builder to API-compatible JSON data.
	 *
	 * @remarks
	 * This method runs validations on the data before serializing it.
	 * As such, it may throw an error if the data is invalid.
	 */
	public toJSON(): APIApplicationCommandSubcommandGroupOption {
		validateRequiredParameters(this.name, this.description, this.options);

		return {
			type: ApplicationCommandOptionType.SubcommandGroup,
			name: this.name,
			name_localizations: this.name_localizations,
			description: this.description,
			description_localizations: this.description_localizations,
			options: this.options.map((option) => option.toJSON()),
		};
	}
}

export interface SlashCommandSubcommandGroupBuilder extends SharedNameAndDescription {}

/**
 * A builder that creates API-compatible JSON data for slash command subcommands.
 *
 * @see {@link https://discord.com/developers/docs/interactions/application-commands#subcommands-and-subcommand-groups}
 */
@mix(SharedNameAndDescription, SharedSlashCommandOptions)
export class SlashCommandSubcommandBuilder implements ToAPIApplicationCommandOptions {
	/**
	 * The name of this subcommand.
	 */
	public readonly name: string = undefined!;

	/**
	 * The description of this subcommand.
	 */
	public readonly description: string = undefined!;

	/**
	 * The options within this subcommand.
	 */
	public readonly options: ApplicationCommandOptionBase[] = [];

	/**
	 * Serializes this builder to API-compatible JSON data.
	 *
	 * @remarks
	 * This method runs validations on the data before serializing it.
	 * As such, it may throw an error if the data is invalid.
	 */
	public toJSON(): APIApplicationCommandSubcommandOption {
		validateRequiredParameters(this.name, this.description, this.options);

		return {
			type: ApplicationCommandOptionType.Subcommand,
			name: this.name,
			name_localizations: this.name_localizations,
			description: this.description,
			description_localizations: this.description_localizations,
			options: this.options.map((option) => option.toJSON()),
		};
	}
}

export interface SlashCommandSubcommandBuilder
	extends SharedNameAndDescription,
		SharedSlashCommandOptions<SlashCommandSubcommandBuilder> {}

```

# packages\builders\src\messages\embed\Assertions.ts

```ts
import { s } from '@sapphire/shapeshift';
import type { APIEmbedField } from 'discord-api-types/v10';
import { isValidationEnabled } from '../../util/validation.js';

export const fieldNamePredicate = s.string
	.lengthGreaterThanOrEqual(1)
	.lengthLessThanOrEqual(256)
	.setValidationEnabled(isValidationEnabled);

export const fieldValuePredicate = s.string
	.lengthGreaterThanOrEqual(1)
	.lengthLessThanOrEqual(1_024)
	.setValidationEnabled(isValidationEnabled);

export const fieldInlinePredicate = s.boolean.optional;

export const embedFieldPredicate = s
	.object({
		name: fieldNamePredicate,
		value: fieldValuePredicate,
		inline: fieldInlinePredicate,
	})
	.setValidationEnabled(isValidationEnabled);

export const embedFieldsArrayPredicate = embedFieldPredicate.array.setValidationEnabled(isValidationEnabled);

export const fieldLengthPredicate = s.number.lessThanOrEqual(25).setValidationEnabled(isValidationEnabled);

export function validateFieldLength(amountAdding: number, fields?: APIEmbedField[]): void {
	fieldLengthPredicate.parse((fields?.length ?? 0) + amountAdding);
}

export const authorNamePredicate = fieldNamePredicate.nullable.setValidationEnabled(isValidationEnabled);

export const imageURLPredicate = s.string
	.url({
		allowedProtocols: ['http:', 'https:', 'attachment:'],
	})
	.nullish.setValidationEnabled(isValidationEnabled);

export const urlPredicate = s.string
	.url({
		allowedProtocols: ['http:', 'https:'],
	})
	.nullish.setValidationEnabled(isValidationEnabled);

export const embedAuthorPredicate = s
	.object({
		name: authorNamePredicate,
		iconURL: imageURLPredicate,
		url: urlPredicate,
	})
	.setValidationEnabled(isValidationEnabled);

export const RGBPredicate = s.number.int
	.greaterThanOrEqual(0)
	.lessThanOrEqual(255)
	.setValidationEnabled(isValidationEnabled);
export const colorPredicate = s.number.int
	.greaterThanOrEqual(0)
	.lessThanOrEqual(0xffffff)
	.or(s.tuple([RGBPredicate, RGBPredicate, RGBPredicate]))
	.nullable.setValidationEnabled(isValidationEnabled);

export const descriptionPredicate = s.string
	.lengthGreaterThanOrEqual(1)
	.lengthLessThanOrEqual(4_096)
	.nullable.setValidationEnabled(isValidationEnabled);

export const footerTextPredicate = s.string
	.lengthGreaterThanOrEqual(1)
	.lengthLessThanOrEqual(2_048)
	.nullable.setValidationEnabled(isValidationEnabled);

export const embedFooterPredicate = s
	.object({
		text: footerTextPredicate,
		iconURL: imageURLPredicate,
	})
	.setValidationEnabled(isValidationEnabled);

export const timestampPredicate = s.union(s.number, s.date).nullable.setValidationEnabled(isValidationEnabled);

export const titlePredicate = fieldNamePredicate.nullable.setValidationEnabled(isValidationEnabled);

```

# packages\builders\src\messages\embed\Embed.ts

```ts
import type { APIEmbed, APIEmbedAuthor, APIEmbedField, APIEmbedFooter, APIEmbedImage } from 'discord-api-types/v10';
import { normalizeArray, type RestOrArray } from '../../util/normalizeArray.js';
import {
	colorPredicate,
	descriptionPredicate,
	embedAuthorPredicate,
	embedFieldsArrayPredicate,
	embedFooterPredicate,
	imageURLPredicate,
	timestampPredicate,
	titlePredicate,
	urlPredicate,
	validateFieldLength,
} from './Assertions.js';

/**
 * A tuple satisfying the RGB color model.
 *
 * @see {@link https://developer.mozilla.org/docs/Glossary/RGB}
 */
export type RGBTuple = [red: number, green: number, blue: number];

/**
 * The base icon data typically used in payloads.
 */
export interface IconData {
	/**
	 * The URL of the icon.
	 */
	iconURL?: string;
	/**
	 * The proxy URL of the icon.
	 */
	proxyIconURL?: string;
}

/**
 * Represents the author data of an embed.
 */
export interface EmbedAuthorData extends IconData, Omit<APIEmbedAuthor, 'icon_url' | 'proxy_icon_url'> {}

/**
 * Represents the author options of an embed.
 */
export interface EmbedAuthorOptions extends Omit<EmbedAuthorData, 'proxyIconURL'> {}

/**
 * Represents the footer data of an embed.
 */
export interface EmbedFooterData extends IconData, Omit<APIEmbedFooter, 'icon_url' | 'proxy_icon_url'> {}

/**
 * Represents the footer options of an embed.
 */
export interface EmbedFooterOptions extends Omit<EmbedFooterData, 'proxyIconURL'> {}

/**
 * Represents the image data of an embed.
 */
export interface EmbedImageData extends Omit<APIEmbedImage, 'proxy_url'> {
	/**
	 * The proxy URL for the image.
	 */
	proxyURL?: string;
}

/**
 * A builder that creates API-compatible JSON data for embeds.
 */
export class EmbedBuilder {
	/**
	 * The API data associated with this embed.
	 */
	public readonly data: APIEmbed;

	/**
	 * Creates a new embed from API data.
	 *
	 * @param data - The API data to create this embed with
	 */
	public constructor(data: APIEmbed = {}) {
		this.data = { ...data };
		if (data.timestamp) this.data.timestamp = new Date(data.timestamp).toISOString();
	}

	/**
	 * Appends fields to the embed.
	 *
	 * @remarks
	 * This method accepts either an array of fields or a variable number of field parameters.
	 * The maximum amount of fields that can be added is 25.
	 * @example
	 * Using an array:
	 * ```ts
	 * const fields: APIEmbedField[] = ...;
	 * const embed = new EmbedBuilder()
	 * 	.addFields(fields);
	 * ```
	 * @example
	 * Using rest parameters (variadic):
	 * ```ts
	 * const embed = new EmbedBuilder()
	 * 	.addFields(
	 * 		{ name: 'Field 1', value: 'Value 1' },
	 * 		{ name: 'Field 2', value: 'Value 2' },
	 * 	);
	 * ```
	 * @param fields - The fields to add
	 */
	public addFields(...fields: RestOrArray<APIEmbedField>): this {
		const normalizedFields = normalizeArray(fields);
		// Ensure adding these fields won't exceed the 25 field limit
		validateFieldLength(normalizedFields.length, this.data.fields);

		// Data assertions
		embedFieldsArrayPredicate.parse(normalizedFields);

		if (this.data.fields) this.data.fields.push(...normalizedFields);
		else this.data.fields = normalizedFields;
		return this;
	}

	/**
	 * Removes, replaces, or inserts fields for this embed.
	 *
	 * @remarks
	 * This method behaves similarly
	 * to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice | Array.prototype.splice()}.
	 * The maximum amount of fields that can be added is 25.
	 *
	 * It's useful for modifying and adjusting order of the already-existing fields of an embed.
	 * @example
	 * Remove the first field:
	 * ```ts
	 * embed.spliceFields(0, 1);
	 * ```
	 * @example
	 * Remove the first n fields:
	 * ```ts
	 * const n = 4;
	 * embed.spliceFields(0, n);
	 * ```
	 * @example
	 * Remove the last field:
	 * ```ts
	 * embed.spliceFields(-1, 1);
	 * ```
	 * @param index - The index to start at
	 * @param deleteCount - The number of fields to remove
	 * @param fields - The replacing field objects
	 */
	public spliceFields(index: number, deleteCount: number, ...fields: APIEmbedField[]): this {
		// Ensure adding these fields won't exceed the 25 field limit
		validateFieldLength(fields.length - deleteCount, this.data.fields);

		// Data assertions
		embedFieldsArrayPredicate.parse(fields);
		if (this.data.fields) this.data.fields.splice(index, deleteCount, ...fields);
		else this.data.fields = fields;
		return this;
	}

	/**
	 * Sets the fields for this embed.
	 *
	 * @remarks
	 * This method is an alias for {@link EmbedBuilder.spliceFields}. More specifically,
	 * it splices the entire array of fields, replacing them with the provided fields.
	 *
	 * You can set a maximum of 25 fields.
	 * @param fields - The fields to set
	 */
	public setFields(...fields: RestOrArray<APIEmbedField>): this {
		this.spliceFields(0, this.data.fields?.length ?? 0, ...normalizeArray(fields));
		return this;
	}

	/**
	 * Sets the author of this embed.
	 *
	 * @param options - The options to use
	 */

	public setAuthor(options: EmbedAuthorOptions | null): this {
		if (options === null) {
			this.data.author = undefined;
			return this;
		}

		// Data assertions
		embedAuthorPredicate.parse(options);

		this.data.author = { name: options.name, url: options.url, icon_url: options.iconURL };
		return this;
	}

	/**
	 * Sets the color of this embed.
	 *
	 * @param color - The color to use
	 */
	public setColor(color: RGBTuple | number | null): this {
		// Data assertions
		colorPredicate.parse(color);

		if (Array.isArray(color)) {
			const [red, green, blue] = color;
			this.data.color = (red << 16) + (green << 8) + blue;
			return this;
		}

		this.data.color = color ?? undefined;
		return this;
	}

	/**
	 * Sets the description of this embed.
	 *
	 * @param description - The description to use
	 */
	public setDescription(description: string | null): this {
		// Data assertions
		descriptionPredicate.parse(description);

		this.data.description = description ?? undefined;
		return this;
	}

	/**
	 * Sets the footer of this embed.
	 *
	 * @param options - The footer to use
	 */
	public setFooter(options: EmbedFooterOptions | null): this {
		if (options === null) {
			this.data.footer = undefined;
			return this;
		}

		// Data assertions
		embedFooterPredicate.parse(options);

		this.data.footer = { text: options.text, icon_url: options.iconURL };
		return this;
	}

	/**
	 * Sets the image of this embed.
	 *
	 * @param url - The image URL to use
	 */
	public setImage(url: string | null): this {
		// Data assertions
		imageURLPredicate.parse(url);

		this.data.image = url ? { url } : undefined;
		return this;
	}

	/**
	 * Sets the thumbnail of this embed.
	 *
	 * @param url - The thumbnail URL to use
	 */
	public setThumbnail(url: string | null): this {
		// Data assertions
		imageURLPredicate.parse(url);

		this.data.thumbnail = url ? { url } : undefined;
		return this;
	}

	/**
	 * Sets the timestamp of this embed.
	 *
	 * @param timestamp - The timestamp or date to use
	 */
	public setTimestamp(timestamp: Date | number | null = Date.now()): this {
		// Data assertions
		timestampPredicate.parse(timestamp);

		this.data.timestamp = timestamp ? new Date(timestamp).toISOString() : undefined;
		return this;
	}

	/**
	 * Sets the title for this embed.
	 *
	 * @param title - The title to use
	 */
	public setTitle(title: string | null): this {
		// Data assertions
		titlePredicate.parse(title);

		this.data.title = title ?? undefined;
		return this;
	}

	/**
	 * Sets the URL of this embed.
	 *
	 * @param url - The URL to use
	 */
	public setURL(url: string | null): this {
		// Data assertions
		urlPredicate.parse(url);

		this.data.url = url ?? undefined;
		return this;
	}

	/**
	 * Serializes this builder to API-compatible JSON data.
	 *
	 * @remarks
	 * This method runs validations on the data before serializing it.
	 * As such, it may throw an error if the data is invalid.
	 */
	public toJSON(): APIEmbed {
		return { ...this.data };
	}
}

```

# packages\builders\src\util\componentUtil.ts

```ts
import type { APIEmbed } from 'discord-api-types/v10';

/**
 * Calculates the length of the embed.
 *
 * @param data - The embed data to check
 */
export function embedLength(data: APIEmbed) {
	return (
		(data.title?.length ?? 0) +
		(data.description?.length ?? 0) +
		(data.fields?.reduce((prev, curr) => prev + curr.name.length + curr.value.length, 0) ?? 0) +
		(data.footer?.text.length ?? 0) +
		(data.author?.name.length ?? 0)
	);
}

```

# packages\builders\src\util\normalizeArray.ts

```ts
/**
 * Normalizes data that is a rest parameter or an array into an array with a depth of 1.
 *
 * @typeParam ItemType - The data that must satisfy {@link RestOrArray}.
 * @param arr - The (possibly variadic) data to normalize
 */
export function normalizeArray<ItemType>(arr: RestOrArray<ItemType>): ItemType[] {
	if (Array.isArray(arr[0])) return [...arr[0]];
	return arr as ItemType[];
}

/**
 * Represents data that may be an array or came from a rest parameter.
 *
 * @remarks
 * This type is used throughout builders to ensure both an array and variadic arguments
 * may be used. It is normalized with {@link normalizeArray}.
 */
export type RestOrArray<Type> = Type[] | [Type[]];

```

# packages\builders\src\util\validation.ts

```ts
let validate = true;

/**
 * Enables validators.
 *
 * @returns Whether validation is occurring.
 */
export function enableValidators() {
	return (validate = true);
}

/**
 * Disables validators.
 *
 * @returns Whether validation is occurring.
 */
export function disableValidators() {
	return (validate = false);
}

/**
 * Checks whether validation is occurring.
 */
export function isValidationEnabled() {
	return validate;
}

```

# packages\builders\tsup.config.ts

```ts
import { esbuildPluginVersionInjector } from 'esbuild-plugin-version-injector';
import { createTsupConfig } from '../../tsup.config.js';

export default createTsupConfig({
	esbuildPlugins: [esbuildPluginVersionInjector()],
});

```

# packages\builders\__tests__\components\actionRow.test.ts

```ts
import {
	ButtonStyle,
	ComponentType,
	type APIActionRowComponent,
	type APIMessageActionRowComponent,
} from 'discord-api-types/v10';
import { describe, test, expect } from 'vitest';
import {
	ActionRowBuilder,
	ButtonBuilder,
	createComponentBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from '../../src/index.js';

const rowWithButtonData: APIActionRowComponent<APIMessageActionRowComponent> = {
	type: ComponentType.ActionRow,
	components: [
		{
			type: ComponentType.Button,
			label: 'test',
			custom_id: '123',
			style: ButtonStyle.Primary,
		},
	],
};

const rowWithSelectMenuData: APIActionRowComponent<APIMessageActionRowComponent> = {
	type: ComponentType.ActionRow,
	components: [
		{
			type: ComponentType.StringSelect,
			custom_id: '1234',
			options: [
				{
					label: 'one',
					value: 'one',
				},
				{
					label: 'two',
					value: 'two',
				},
			],
			max_values: 10,
			min_values: 12,
		},
	],
};

describe('Action Row Components', () => {
	describe('Assertion Tests', () => {
		test('GIVEN valid components THEN do not throw', () => {
			expect(() => new ActionRowBuilder().addComponents(new ButtonBuilder())).not.toThrowError();
			expect(() => new ActionRowBuilder().setComponents(new ButtonBuilder())).not.toThrowError();
			expect(() => new ActionRowBuilder().addComponents([new ButtonBuilder()])).not.toThrowError();
			expect(() => new ActionRowBuilder().setComponents([new ButtonBuilder()])).not.toThrowError();
		});

		test('GIVEN valid JSON input THEN valid JSON output is given', () => {
			const actionRowData: APIActionRowComponent<APIMessageActionRowComponent> = {
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: 'button',
						style: ButtonStyle.Primary,
						custom_id: 'test',
					},
					{
						type: ComponentType.Button,
						label: 'link',
						style: ButtonStyle.Link,
						url: 'https://google.com',
					},
					{
						type: ComponentType.StringSelect,
						placeholder: 'test',
						custom_id: 'test',
						options: [
							{
								label: 'option',
								value: 'option',
							},
						],
					},
				],
			};

			expect(new ActionRowBuilder(actionRowData).toJSON()).toEqual(actionRowData);
			expect(new ActionRowBuilder().toJSON()).toEqual({ type: ComponentType.ActionRow, components: [] });
			expect(() => createComponentBuilder({ type: ComponentType.ActionRow, components: [] })).not.toThrowError();
		});

		test('GIVEN valid builder options THEN valid JSON output is given', () => {
			const rowWithButtonData: APIActionRowComponent<APIMessageActionRowComponent> = {
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: 'test',
						custom_id: '123',
						style: ButtonStyle.Primary,
					},
				],
			};

			const rowWithSelectMenuData: APIActionRowComponent<APIMessageActionRowComponent> = {
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.StringSelect,
						custom_id: '1234',
						options: [
							{
								label: 'one',
								value: 'one',
							},
							{
								label: 'two',
								value: 'two',
							},
						],
						max_values: 10,
						min_values: 12,
					},
				],
			};

			expect(new ActionRowBuilder(rowWithButtonData).toJSON()).toEqual(rowWithButtonData);
			expect(new ActionRowBuilder(rowWithSelectMenuData).toJSON()).toEqual(rowWithSelectMenuData);
			expect(new ActionRowBuilder().toJSON()).toEqual({ type: ComponentType.ActionRow, components: [] });
			expect(() => createComponentBuilder({ type: ComponentType.ActionRow, components: [] })).not.toThrowError();
		});

		test('GIVEN valid builder options THEN valid JSON output is given 2', () => {
			const button = new ButtonBuilder().setLabel('test').setStyle(ButtonStyle.Primary).setCustomId('123');
			const selectMenu = new StringSelectMenuBuilder()
				.setCustomId('1234')
				.setMaxValues(10)
				.setMinValues(12)
				.setOptions(
					new StringSelectMenuOptionBuilder().setLabel('one').setValue('one'),
					new StringSelectMenuOptionBuilder().setLabel('two').setValue('two'),
				)
				.setOptions([
					new StringSelectMenuOptionBuilder().setLabel('one').setValue('one'),
					new StringSelectMenuOptionBuilder().setLabel('two').setValue('two'),
				]);

			expect(new ActionRowBuilder().addComponents(button).toJSON()).toEqual(rowWithButtonData);
			expect(new ActionRowBuilder().addComponents(selectMenu).toJSON()).toEqual(rowWithSelectMenuData);
			expect(new ActionRowBuilder().addComponents([button]).toJSON()).toEqual(rowWithButtonData);
			expect(new ActionRowBuilder().addComponents([selectMenu]).toJSON()).toEqual(rowWithSelectMenuData);
		});
	});
});

```

# packages\builders\__tests__\components\button.test.ts

```ts
import {
	ButtonStyle,
	ComponentType,
	type APIButtonComponentWithCustomId,
	type APIButtonComponentWithURL,
} from 'discord-api-types/v10';
import { describe, test, expect } from 'vitest';
import { buttonLabelValidator, buttonStyleValidator } from '../../src/components/Assertions.js';
import { ButtonBuilder } from '../../src/components/button/Button.js';

const buttonComponent = () => new ButtonBuilder();

const longStr =
	'looooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong';

describe('Button Components', () => {
	describe('Assertion Tests', () => {
		test('GIVEN valid label THEN validator does not throw', () => {
			expect(() => buttonLabelValidator.parse('foobar')).not.toThrowError();
		});

		test('GIVEN invalid label THEN validator does throw', () => {
			expect(() => buttonLabelValidator.parse(null)).toThrowError();
			expect(() => buttonLabelValidator.parse('')).toThrowError();

			expect(() => buttonLabelValidator.parse(longStr)).toThrowError();
		});

		test('GIVEN valid style THEN validator does not throw', () => {
			expect(() => buttonStyleValidator.parse(3)).not.toThrowError();
			expect(() => buttonStyleValidator.parse(ButtonStyle.Secondary)).not.toThrowError();
		});

		test('GIVEN invalid style THEN validator does throw', () => {
			expect(() => buttonStyleValidator.parse(7)).toThrowError();
		});

		test('GIVEN valid fields THEN builder does not throw', () => {
			expect(() =>
				buttonComponent().setCustomId('custom').setStyle(ButtonStyle.Primary).setLabel('test'),
			).not.toThrowError();

			expect(() => {
				const button = buttonComponent()
					.setCustomId('custom')
					.setStyle(ButtonStyle.Primary)
					.setDisabled(true)
					.setEmoji({ name: 'test' });

				button.toJSON();
			}).not.toThrowError();

			expect(() => {
				const button = buttonComponent().setSKUId('123456789012345678').setStyle(ButtonStyle.Premium);
				button.toJSON();
			}).not.toThrowError();

			expect(() => buttonComponent().setURL('https://google.com')).not.toThrowError();
		});

		test('GIVEN invalid fields THEN build does throw', () => {
			expect(() => {
				buttonComponent().setCustomId(longStr);
			}).toThrowError();

			expect(() => {
				const button = buttonComponent()
					.setCustomId('custom')
					.setStyle(ButtonStyle.Primary)
					.setDisabled(true)
					.setLabel('test')
					.setURL('https://google.com')
					.setEmoji({ name: 'test' });

				button.toJSON();
			}).toThrowError();

			expect(() => {
				// @ts-expect-error: Invalid emoji
				const button = buttonComponent().setEmoji('test');
				button.toJSON();
			}).toThrowError();

			expect(() => {
				const button = buttonComponent().setStyle(ButtonStyle.Primary);
				button.toJSON();
			}).toThrowError();

			expect(() => {
				const button = buttonComponent().setStyle(ButtonStyle.Primary).setCustomId('test');
				button.toJSON();
			}).toThrowError();

			expect(() => {
				const button = buttonComponent().setStyle(ButtonStyle.Link);
				button.toJSON();
			}).toThrowError();

			expect(() => {
				const button = buttonComponent().setStyle(ButtonStyle.Primary).setLabel('test').setURL('https://google.com');
				button.toJSON();
			}).toThrowError();

			expect(() => {
				const button = buttonComponent().setStyle(ButtonStyle.Link).setLabel('test');
				button.toJSON();
			}).toThrowError();

			expect(() => {
				const button = buttonComponent().setStyle(ButtonStyle.Primary).setSKUId('123456789012345678');
				button.toJSON();
			}).toThrowError();

			expect(() => {
				const button = buttonComponent()
					.setStyle(ButtonStyle.Secondary)
					.setLabel('button')
					.setSKUId('123456789012345678');

				button.toJSON();
			}).toThrowError();

			expect(() => {
				const button = buttonComponent()
					.setStyle(ButtonStyle.Success)
					.setEmoji({ name: '😇' })
					.setSKUId('123456789012345678');

				button.toJSON();
			}).toThrowError();

			expect(() => {
				const button = buttonComponent()
					.setStyle(ButtonStyle.Danger)
					.setCustomId('test')
					.setSKUId('123456789012345678');

				button.toJSON();
			}).toThrowError();

			expect(() => {
				const button = buttonComponent()
					.setStyle(ButtonStyle.Link)
					.setURL('https://google.com')
					.setSKUId('123456789012345678');

				button.toJSON();
			}).toThrowError();

			// @ts-expect-error: Invalid style
			expect(() => buttonComponent().setStyle(24)).toThrowError();
			expect(() => buttonComponent().setLabel(longStr)).toThrowError();
			// @ts-expect-error: Invalid parameter for disabled
			expect(() => buttonComponent().setDisabled(0)).toThrowError();
			// @ts-expect-error: Invalid emoji
			expect(() => buttonComponent().setEmoji('foo')).toThrowError();

			expect(() => buttonComponent().setURL('foobar')).toThrowError();
		});

		test('GiVEN valid input THEN valid JSON outputs are given', () => {
			const interactionData: APIButtonComponentWithCustomId = {
				type: ComponentType.Button,
				custom_id: 'test',
				label: 'test',
				style: ButtonStyle.Primary,
				disabled: true,
			};

			expect(new ButtonBuilder(interactionData).toJSON()).toEqual(interactionData);

			expect(
				buttonComponent()
					.setCustomId(interactionData.custom_id)
					.setLabel(interactionData.label!)
					.setStyle(interactionData.style)
					.setDisabled(interactionData.disabled)
					.toJSON(),
			).toEqual(interactionData);

			const linkData: APIButtonComponentWithURL = {
				type: ComponentType.Button,
				label: 'test',
				style: ButtonStyle.Link,
				disabled: true,
				url: 'https://google.com',
			};

			expect(new ButtonBuilder(linkData).toJSON()).toEqual(linkData);

			expect(buttonComponent().setLabel(linkData.label!).setDisabled(true).setURL(linkData.url));
		});
	});
});

```

# packages\builders\__tests__\components\components.test.ts

```ts
import {
	ButtonStyle,
	ComponentType,
	TextInputStyle,
	type APIButtonComponent,
	type APIMessageActionRowComponent,
	type APISelectMenuComponent,
	type APITextInputComponent,
	type APIActionRowComponent,
} from 'discord-api-types/v10';
import { describe, test, expect } from 'vitest';
import {
	ActionRowBuilder,
	ButtonBuilder,
	createComponentBuilder,
	StringSelectMenuBuilder,
	TextInputBuilder,
} from '../../src/index.js';

describe('createComponentBuilder', () => {
	test.each([ButtonBuilder, StringSelectMenuBuilder, TextInputBuilder])(
		'passing an instance of %j should return itself',
		(Builder) => {
			const builder = new Builder();
			expect(createComponentBuilder(builder)).toBe(builder);
		},
	);

	test('GIVEN an action row component THEN returns a ActionRowBuilder', () => {
		const actionRow: APIActionRowComponent<APIMessageActionRowComponent> = {
			components: [],
			type: ComponentType.ActionRow,
		};

		expect(createComponentBuilder(actionRow)).toBeInstanceOf(ActionRowBuilder);
	});

	test('GIVEN a button component THEN returns a ButtonBuilder', () => {
		const button: APIButtonComponent = {
			custom_id: 'abc',
			style: ButtonStyle.Primary,
			type: ComponentType.Button,
		};

		expect(createComponentBuilder(button)).toBeInstanceOf(ButtonBuilder);
	});

	test('GIVEN a select menu component THEN returns a StringSelectMenuBuilder', () => {
		const selectMenu: APISelectMenuComponent = {
			custom_id: 'abc',
			options: [],
			type: ComponentType.StringSelect,
		};

		expect(createComponentBuilder(selectMenu)).toBeInstanceOf(StringSelectMenuBuilder);
	});

	test('GIVEN a text input component THEN returns a TextInputBuilder', () => {
		const textInput: APITextInputComponent = {
			custom_id: 'abc',
			label: 'abc',
			style: TextInputStyle.Short,
			type: ComponentType.TextInput,
		};

		expect(createComponentBuilder(textInput)).toBeInstanceOf(TextInputBuilder);
	});

	test('GIVEN an unknown component type THEN throws error', () => {
		// @ts-expect-error: Unknown component type
		expect(() => createComponentBuilder({ type: 'invalid' })).toThrowError();
	});
});

```

# packages\builders\__tests__\components\selectMenu.test.ts

```ts
import { ComponentType, type APISelectMenuComponent, type APISelectMenuOption } from 'discord-api-types/v10';
import { describe, test, expect } from 'vitest';
import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from '../../src/index.js';

const selectMenu = () => new StringSelectMenuBuilder();
const selectMenuOption = () => new StringSelectMenuOptionBuilder();

const longStr = 'a'.repeat(256);

const selectMenuOptionData: APISelectMenuOption = {
	label: 'test',
	value: 'test',
	emoji: { name: 'test' },
	default: true,
	description: 'test',
};

const selectMenuDataWithoutOptions = {
	type: ComponentType.SelectMenu,
	custom_id: 'test',
	max_values: 10,
	min_values: 3,
	disabled: true,
	placeholder: 'test',
} as const;

const selectMenuData: APISelectMenuComponent = {
	...selectMenuDataWithoutOptions,
	options: [selectMenuOptionData],
};

function makeStringSelectMenuWithOptions() {
	const selectMenu = new StringSelectMenuBuilder();
	selectMenu.addOptions(
		{ label: 'foo', value: 'bar' },
		{ label: 'foo2', value: 'bar2' },
		{ label: 'foo3', value: 'bar3' },
	);
	return selectMenu;
}

function mapStringSelectMenuOptionBuildersToJson(selectMenu: StringSelectMenuBuilder) {
	return selectMenu.options.map((option) => option.toJSON());
}

describe('Select Menu Components', () => {
	describe('Assertion Tests', () => {
		test('GIVEN valid inputs THEN Select Menu does not throw', () => {
			expect(() => selectMenu().setCustomId('foo')).not.toThrowError();
			expect(() => selectMenu().setMaxValues(10)).not.toThrowError();
			expect(() => selectMenu().setMinValues(3)).not.toThrowError();
			expect(() => selectMenu().setDisabled(true)).not.toThrowError();
			expect(() => selectMenu().setDisabled()).not.toThrowError();
			expect(() => selectMenu().setPlaceholder('description')).not.toThrowError();
			const option = selectMenuOption()
				.setLabel('test')
				.setValue('test')
				.setDefault(true)
				.setEmoji({ name: 'test' })
				.setDescription('description');
			expect(() => selectMenu().addOptions(option)).not.toThrowError();
			expect(() => selectMenu().setOptions(option)).not.toThrowError();
			expect(() => selectMenu().setOptions({ label: 'test', value: 'test' })).not.toThrowError();
			expect(() => selectMenu().addOptions([option])).not.toThrowError();
			expect(() => selectMenu().setOptions([option])).not.toThrowError();
			expect(() => selectMenu().setOptions([{ label: 'test', value: 'test' }])).not.toThrowError();
			expect(() =>
				selectMenu()
					.addOptions({
						label: 'test',
						value: 'test',
						emoji: {
							id: '123',
							name: 'test',
							animated: true,
						},
					})
					.addOptions([
						{
							label: 'test',
							value: 'test',
							emoji: {
								id: '123',
								name: 'test',
								animated: true,
							},
						},
					]),
			).not.toThrowError();

			const options = Array.from<APISelectMenuOption>({ length: 25 }).fill({ label: 'test', value: 'test' });

			expect(() => selectMenu().addOptions(...options)).not.toThrowError();
			expect(() => selectMenu().setOptions(...options)).not.toThrowError();
			expect(() => selectMenu().addOptions(options)).not.toThrowError();
			expect(() => selectMenu().setOptions(options)).not.toThrowError();

			expect(() =>
				selectMenu()
					.addOptions({ label: 'test', value: 'test' })

					.addOptions(...Array.from<APISelectMenuOption>({ length: 24 }).fill({ label: 'test', value: 'test' })),
			).not.toThrowError();
			expect(() =>
				selectMenu()
					.addOptions([{ label: 'test', value: 'test' }])
					.addOptions(Array.from<APISelectMenuOption>({ length: 24 }).fill({ label: 'test', value: 'test' })),
			).not.toThrowError();
		});

		test('GIVEN invalid inputs THEN Select Menu does throw', () => {
			expect(() => selectMenu().setCustomId(longStr)).toThrowError();
			expect(() => selectMenu().setMaxValues(30)).toThrowError();
			expect(() => selectMenu().setMinValues(-20)).toThrowError();
			// @ts-expect-error: Invalid disabled value
			expect(() => selectMenu().setDisabled(0)).toThrowError();
			expect(() => selectMenu().setPlaceholder(longStr)).toThrowError();
			// @ts-expect-error: Invalid option
			expect(() => selectMenu().addOptions({ label: 'test' })).toThrowError();
			expect(() => selectMenu().addOptions({ label: longStr, value: 'test' })).toThrowError();
			expect(() => selectMenu().addOptions({ value: longStr, label: 'test' })).toThrowError();
			expect(() => selectMenu().addOptions({ label: 'test', value: 'test', description: longStr })).toThrowError();
			// @ts-expect-error: Invalid option
			expect(() => selectMenu().addOptions({ label: 'test', value: 'test', default: 100 })).toThrowError();
			// @ts-expect-error: Invalid option
			expect(() => selectMenu().addOptions({ value: 'test' })).toThrowError();
			// @ts-expect-error: Invalid option
			expect(() => selectMenu().addOptions({ default: true })).toThrowError();
			// @ts-expect-error: Invalid option
			expect(() => selectMenu().addOptions([{ label: 'test' }])).toThrowError();
			expect(() => selectMenu().addOptions([{ label: longStr, value: 'test' }])).toThrowError();
			expect(() => selectMenu().addOptions([{ value: longStr, label: 'test' }])).toThrowError();
			expect(() => selectMenu().addOptions([{ label: 'test', value: 'test', description: longStr }])).toThrowError();
			// @ts-expect-error: Invalid option
			expect(() => selectMenu().addOptions([{ label: 'test', value: 'test', default: 100 }])).toThrowError();
			// @ts-expect-error: Invalid option
			expect(() => selectMenu().addOptions([{ value: 'test' }])).toThrowError();
			// @ts-expect-error: Invalid option
			expect(() => selectMenu().addOptions([{ default: true }])).toThrowError();

			const tooManyOptions = Array.from<APISelectMenuOption>({ length: 26 }).fill({ label: 'test', value: 'test' });

			expect(() => selectMenu().setOptions(...tooManyOptions)).toThrowError();
			expect(() => selectMenu().setOptions(tooManyOptions)).toThrowError();

			expect(() =>
				selectMenu()
					.addOptions({ label: 'test', value: 'test' })
					.addOptions(...tooManyOptions),
			).toThrowError();
			expect(() =>
				selectMenu()
					.addOptions([{ label: 'test', value: 'test' }])
					.addOptions(tooManyOptions),
			).toThrowError();

			expect(() => {
				selectMenuOption()
					.setLabel(longStr)
					.setValue(longStr)
					// @ts-expect-error: Invalid default value
					.setDefault(-1)
					// @ts-expect-error: Invalid emoji
					.setEmoji({ name: 1 })
					.setDescription(longStr);
			}).toThrowError();
		});

		test('GIVEN valid option types THEN does not throw', () => {
			expect(() =>
				selectMenu().addOptions({
					label: 'test',
					value: 'test',
				}),
			).not.toThrowError();

			expect(() => selectMenu().addOptions(selectMenuOption().setLabel('test').setValue('test'))).not.toThrowError();
		});

		test('GIVEN valid JSON input THEN valid JSON history is correct', () => {
			expect(
				new StringSelectMenuBuilder(selectMenuDataWithoutOptions)
					.addOptions(new StringSelectMenuOptionBuilder(selectMenuOptionData))
					.toJSON(),
			).toEqual(selectMenuData);
			expect(
				new StringSelectMenuBuilder(selectMenuDataWithoutOptions)
					.addOptions([new StringSelectMenuOptionBuilder(selectMenuOptionData)])
					.toJSON(),
			).toEqual(selectMenuData);
			expect(new StringSelectMenuOptionBuilder(selectMenuOptionData).toJSON()).toEqual(selectMenuOptionData);
		});

		test('GIVEN a StringSelectMenuBuilder using StringSelectMenuBuilder#spliceOptions works', () => {
			expect(
				mapStringSelectMenuOptionBuildersToJson(makeStringSelectMenuWithOptions().spliceOptions(0, 1)),
			).toStrictEqual([
				{ label: 'foo2', value: 'bar2' },
				{ label: 'foo3', value: 'bar3' },
			]);

			expect(
				mapStringSelectMenuOptionBuildersToJson(
					makeStringSelectMenuWithOptions().spliceOptions(0, 1, selectMenuOptionData),
				),
			).toStrictEqual([selectMenuOptionData, { label: 'foo2', value: 'bar2' }, { label: 'foo3', value: 'bar3' }]);

			expect(
				mapStringSelectMenuOptionBuildersToJson(
					makeStringSelectMenuWithOptions().spliceOptions(0, 3, selectMenuOptionData),
				),
			).toStrictEqual([selectMenuOptionData]);

			expect(() =>
				makeStringSelectMenuWithOptions().spliceOptions(
					0,
					0,
					...Array.from({ length: 26 }, () => selectMenuOptionData),
				),
			).toThrowError();

			expect(() =>
				makeStringSelectMenuWithOptions()
					.setOptions(Array.from({ length: 25 }, () => selectMenuOptionData))
					.spliceOptions(-1, 2, selectMenuOptionData, selectMenuOptionData),
			).toThrowError();
		});
	});
});

```

# packages\builders\__tests__\components\textInput.test.ts

```ts
import { ComponentType, TextInputStyle, type APITextInputComponent } from 'discord-api-types/v10';
import { describe, test, expect } from 'vitest';
import {
	labelValidator,
	maxLengthValidator,
	minLengthValidator,
	placeholderValidator,
	valueValidator,
	textInputStyleValidator,
} from '../../src/components/textInput/Assertions.js';
import { TextInputBuilder } from '../../src/components/textInput/TextInput.js';

const superLongStr = 'a'.repeat(5_000);

const textInputComponent = () => new TextInputBuilder();

describe('Text Input Components', () => {
	describe('Assertion Tests', () => {
		test('GIVEN valid label THEN validator does not throw', () => {
			expect(() => labelValidator.parse('foobar')).not.toThrowError();
		});

		test('GIVEN invalid label THEN validator does throw', () => {
			expect(() => labelValidator.parse(24)).toThrowError();
			expect(() => labelValidator.parse(undefined)).toThrowError();
		});

		test('GIVEN valid style THEN validator does not throw', () => {
			expect(() => textInputStyleValidator.parse(TextInputStyle.Paragraph)).not.toThrowError();
			expect(() => textInputStyleValidator.parse(TextInputStyle.Short)).not.toThrowError();
		});

		test('GIVEN invalid style THEN validator does throw', () => {
			expect(() => textInputStyleValidator.parse(24)).toThrowError();
		});

		test('GIVEN valid min length THEN validator does not throw', () => {
			expect(() => minLengthValidator.parse(10)).not.toThrowError();
		});

		test('GIVEN invalid min length THEN validator does throw', () => {
			expect(() => minLengthValidator.parse(-1)).toThrowError();
		});

		test('GIVEN valid max length THEN validator does not throw', () => {
			expect(() => maxLengthValidator.parse(10)).not.toThrowError();
		});

		test('GIVEN invalid min length THEN validator does throw 2', () => {
			expect(() => maxLengthValidator.parse(4_001)).toThrowError();
		});

		test('GIVEN valid value THEN validator does not throw', () => {
			expect(() => valueValidator.parse('foobar')).not.toThrowError();
		});

		test('GIVEN invalid value THEN validator does throw', () => {
			expect(() => valueValidator.parse(superLongStr)).toThrowError();
		});

		test('GIVEN valid placeholder THEN validator does not throw', () => {
			expect(() => placeholderValidator.parse('foobar')).not.toThrowError();
		});

		test('GIVEN invalid value THEN validator does throw 2', () => {
			expect(() => placeholderValidator.parse(superLongStr)).toThrowError();
		});

		test('GIVEN valid fields THEN builder does not throw', () => {
			expect(() => {
				textInputComponent().setCustomId('foobar').setLabel('test').setStyle(TextInputStyle.Paragraph).toJSON();
			}).not.toThrowError();

			expect(() => {
				textInputComponent()
					.setCustomId('foobar')
					.setLabel('test')
					.setMaxLength(100)
					.setMinLength(1)
					.setPlaceholder('bar')
					.setRequired(true)
					.setStyle(TextInputStyle.Paragraph)
					.toJSON();
			}).not.toThrowError();

			expect(() => {
				// Issue #8107
				// @ts-expect-error: Shapeshift maps the enum key to the value when parsing
				textInputComponent().setCustomId('Custom').setLabel('Guess').setStyle('Short').toJSON();
			}).not.toThrowError();
		});
	});

	test('GIVEN invalid fields THEN builder throws', () => {
		expect(() => textInputComponent().toJSON()).toThrowError();
		expect(() => {
			textInputComponent()
				.setCustomId('test')
				.setMaxLength(100)
				.setPlaceholder('hello')
				.setStyle(TextInputStyle.Paragraph)
				.toJSON();
		}).toThrowError();
	});

	test('GIVEN valid input THEN valid JSON outputs are given', () => {
		const textInputData: APITextInputComponent = {
			type: ComponentType.TextInput,
			label: 'label',
			custom_id: 'custom id',
			placeholder: 'placeholder',
			max_length: 100,
			min_length: 10,
			value: 'value',
			required: false,
			style: TextInputStyle.Paragraph,
		};

		expect(new TextInputBuilder(textInputData).toJSON()).toEqual(textInputData);
		expect(
			textInputComponent()
				.setCustomId(textInputData.custom_id)
				.setLabel(textInputData.label)
				.setPlaceholder(textInputData.placeholder!)
				.setMaxLength(textInputData.max_length!)
				.setMinLength(textInputData.min_length!)
				.setValue(textInputData.value!)
				.setRequired(textInputData.required)
				.setStyle(textInputData.style)
				.toJSON(),
		).toEqual(textInputData);
	});
});

```

# packages\builders\__tests__\interactions\ContextMenuCommands.test.ts

```ts
import { ApplicationIntegrationType, InteractionContextType, PermissionFlagsBits } from 'discord-api-types/v10';
import { describe, test, expect } from 'vitest';
import { ContextMenuCommandAssertions, ContextMenuCommandBuilder } from '../../src/index.js';

const getBuilder = () => new ContextMenuCommandBuilder();

describe('Context Menu Commands', () => {
	describe('Assertions tests', () => {
		test('GIVEN valid name THEN does not throw error', () => {
			expect(() => ContextMenuCommandAssertions.validateName('ping')).not.toThrowError();
		});

		test('GIVEN invalid name THEN throw error', () => {
			expect(() => ContextMenuCommandAssertions.validateName(null)).toThrowError();

			// Too short of a name
			expect(() => ContextMenuCommandAssertions.validateName('')).toThrowError();

			// Invalid characters used
			expect(() => ContextMenuCommandAssertions.validateName('ABC123$%^&')).toThrowError();

			// Too long of a name
			expect(() =>
				ContextMenuCommandAssertions.validateName('qwertyuiopasdfghjklzxcvbnmqwertyuiopasdfghjklzxcvbnm'),
			).toThrowError();
		});

		test('GIVEN valid type THEN does not throw error', () => {
			expect(() => ContextMenuCommandAssertions.validateType(3)).not.toThrowError();
		});

		test('GIVEN invalid type THEN throw error', () => {
			expect(() => ContextMenuCommandAssertions.validateType(null)).toThrowError();

			// Out of range
			expect(() => ContextMenuCommandAssertions.validateType(1)).toThrowError();
		});

		test('GIVEN valid required parameters THEN does not throw error', () => {
			expect(() => ContextMenuCommandAssertions.validateRequiredParameters('owo', 2)).not.toThrowError();
		});

		test('GIVEN valid default_permission THEN does not throw error', () => {
			expect(() => ContextMenuCommandAssertions.validateDefaultPermission(true)).not.toThrowError();
		});

		test('GIVEN invalid default_permission THEN throw error', () => {
			expect(() => ContextMenuCommandAssertions.validateDefaultPermission(null)).toThrowError();
		});
	});

	describe('ContextMenuCommandBuilder', () => {
		describe('Builder tests', () => {
			test('GIVEN empty builder THEN throw error when calling toJSON', () => {
				expect(() => getBuilder().toJSON()).toThrowError();
			});

			test('GIVEN valid builder THEN does not throw error', () => {
				expect(() => getBuilder().setName('example').setType(3).toJSON()).not.toThrowError();
			});

			test('GIVEN invalid name THEN throw error', () => {
				expect(() => getBuilder().setName('$$$')).toThrowError();

				expect(() => getBuilder().setName(' ')).toThrowError();
			});

			test('GIVEN valid names THEN does not throw error', () => {
				expect(() => getBuilder().setName('hi_there')).not.toThrowError();

				expect(() => getBuilder().setName('A COMMAND')).not.toThrowError();

				// Translation: a_command
				expect(() => getBuilder().setName('o_comandă')).not.toThrowError();

				// Translation: thx (according to GTranslate)
				expect(() => getBuilder().setName('どうも')).not.toThrowError();
			});

			test('GIVEN valid types THEN does not throw error', () => {
				expect(() => getBuilder().setType(2)).not.toThrowError();

				expect(() => getBuilder().setType(3)).not.toThrowError();
			});

			test('GIVEN valid builder with defaultPermission false THEN does not throw error', () => {
				expect(() => getBuilder().setName('foo').setDefaultPermission(false)).not.toThrowError();
			});

			test('GIVEN valid builder with dmPermission false THEN does not throw error', () => {
				expect(() => getBuilder().setName('foo').setDMPermission(false)).not.toThrowError();
			});
		});

		describe('Context menu command localizations', () => {
			const expectedSingleLocale = { 'en-US': 'foobar' };
			const expectedMultipleLocales = {
				...expectedSingleLocale,
				bg: 'test',
			};

			test('GIVEN valid name localizations THEN does not throw error', () => {
				expect(() => getBuilder().setNameLocalization('en-US', 'foobar')).not.toThrowError();
				expect(() => getBuilder().setNameLocalizations({ 'en-US': 'foobar' })).not.toThrowError();
			});

			test('GIVEN invalid name localizations THEN does throw error', () => {
				// @ts-expect-error: Invalid localization
				expect(() => getBuilder().setNameLocalization('en-U', 'foobar')).toThrowError();
				// @ts-expect-error: Invalid localization
				expect(() => getBuilder().setNameLocalizations({ 'en-U': 'foobar' })).toThrowError();
			});

			test('GIVEN valid name localizations THEN valid data is stored', () => {
				expect(getBuilder().setNameLocalization('en-US', 'foobar').name_localizations).toEqual(expectedSingleLocale);
				expect(getBuilder().setNameLocalizations({ 'en-US': 'foobar', bg: 'test' }).name_localizations).toEqual(
					expectedMultipleLocales,
				);
				expect(getBuilder().setNameLocalizations(null).name_localizations).toBeNull();
				expect(getBuilder().setNameLocalization('en-US', null).name_localizations).toEqual({
					'en-US': null,
				});
			});
		});

		describe('permissions', () => {
			test('GIVEN valid permission string THEN does not throw error', () => {
				expect(() => getBuilder().setDefaultMemberPermissions('1')).not.toThrowError();
			});

			test('GIVEN valid permission bitfield THEN does not throw error', () => {
				expect(() =>
					getBuilder().setDefaultMemberPermissions(PermissionFlagsBits.AddReactions | PermissionFlagsBits.AttachFiles),
				).not.toThrowError();
			});

			test('GIVEN null permissions THEN does not throw error', () => {
				expect(() => getBuilder().setDefaultMemberPermissions(null)).not.toThrowError();
			});

			test('GIVEN invalid inputs THEN does throw error', () => {
				expect(() => getBuilder().setDefaultMemberPermissions('1.1')).toThrowError();

				expect(() => getBuilder().setDefaultMemberPermissions(1.1)).toThrowError();
			});
		});

		describe('contexts', () => {
			test('GIVEN a builder with valid contexts THEN does not throw an error', () => {
				expect(() =>
					getBuilder().setContexts([InteractionContextType.Guild, InteractionContextType.BotDM]),
				).not.toThrowError();

				expect(() =>
					getBuilder().setContexts(InteractionContextType.Guild, InteractionContextType.BotDM),
				).not.toThrowError();
			});

			test('GIVEN a builder with invalid contexts THEN does throw an error', () => {
				// @ts-expect-error: Invalid contexts
				expect(() => getBuilder().setContexts(999)).toThrowError();

				// @ts-expect-error: Invalid contexts
				expect(() => getBuilder().setContexts([999, 998])).toThrowError();
			});
		});

		describe('integration types', () => {
			test('GIVEN a builder with valid integraton types THEN does not throw an error', () => {
				expect(() =>
					getBuilder().setIntegrationTypes([
						ApplicationIntegrationType.GuildInstall,
						ApplicationIntegrationType.UserInstall,
					]),
				).not.toThrowError();

				expect(() =>
					getBuilder().setIntegrationTypes(
						ApplicationIntegrationType.GuildInstall,
						ApplicationIntegrationType.UserInstall,
					),
				).not.toThrowError();
			});

			test('GIVEN a builder with invalid integration types THEN does throw an error', () => {
				// @ts-expect-error: Invalid integration types
				expect(() => getBuilder().setIntegrationTypes(999)).toThrowError();

				// @ts-expect-error: Invalid integration types
				expect(() => getBuilder().setIntegrationTypes([999, 998])).toThrowError();
			});
		});
	});
});

```

# packages\builders\__tests__\interactions\modal.test.ts

```ts
import {
	ComponentType,
	TextInputStyle,
	type APIModalInteractionResponseCallbackData,
	type APITextInputComponent,
} from 'discord-api-types/v10';
import { describe, test, expect } from 'vitest';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ModalBuilder,
	TextInputBuilder,
	type ModalActionRowComponentBuilder,
} from '../../src/index.js';
import {
	componentsValidator,
	titleValidator,
	validateRequiredParameters,
} from '../../src/interactions/modals/Assertions.js';

const modal = () => new ModalBuilder();

describe('Modals', () => {
	describe('Assertion Tests', () => {
		test('GIVEN valid title THEN validator does not throw', () => {
			expect(() => titleValidator.parse('foobar')).not.toThrowError();
		});

		test('GIVEN invalid title THEN validator does throw', () => {
			expect(() => titleValidator.parse(42)).toThrowError();
		});

		test('GIVEN valid components THEN validator does not throw', () => {
			expect(() => componentsValidator.parse([new ActionRowBuilder(), new ActionRowBuilder()])).not.toThrowError();
		});

		test('GIVEN invalid components THEN validator does throw', () => {
			expect(() => componentsValidator.parse([new ButtonBuilder(), new TextInputBuilder()])).toThrowError();
		});

		test('GIVEN valid required parameters THEN validator does not throw', () => {
			expect(() =>
				validateRequiredParameters('123', 'title', [new ActionRowBuilder(), new ActionRowBuilder()]),
			).not.toThrowError();
		});

		test('GIVEN invalid required parameters THEN validator does throw', () => {
			expect(() =>
				// @ts-expect-error: Missing required parameter
				validateRequiredParameters('123', undefined, [new ActionRowBuilder(), new ButtonBuilder()]),
			).toThrowError();
		});
	});

	test('GIVEN valid fields THEN builder does not throw', () => {
		expect(() =>
			modal().setTitle('test').setCustomId('foobar').setComponents(new ActionRowBuilder()),
		).not.toThrowError();

		expect(() =>
			// @ts-expect-error: You can pass a TextInputBuilder and it will add it to an action row
			modal().setTitle('test').setCustomId('foobar').addComponents(new TextInputBuilder()),
		).not.toThrowError();
	});

	test('GIVEN invalid fields THEN builder does throw', () => {
		expect(() => modal().setTitle('test').setCustomId('foobar').toJSON()).toThrowError();

		// @ts-expect-error: CustomId is invalid
		expect(() => modal().setTitle('test').setCustomId(42).toJSON()).toThrowError();
	});

	test('GIVEN valid input THEN valid JSON outputs are given', () => {
		const modalData: APIModalInteractionResponseCallbackData = {
			title: 'title',
			custom_id: 'custom id',
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.TextInput,
							label: 'label',
							style: TextInputStyle.Paragraph,
							custom_id: 'custom id',
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.TextInput,
							label: 'label',
							style: TextInputStyle.Paragraph,
							custom_id: 'custom id',
						},
					],
				},
			],
		};

		expect(new ModalBuilder(modalData).toJSON()).toEqual(modalData);

		expect(
			modal()
				.setTitle(modalData.title)
				.setCustomId('custom id')
				.setComponents(
					new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
						new TextInputBuilder().setCustomId('custom id').setLabel('label').setStyle(TextInputStyle.Paragraph),
					),
				)
				.addComponents([
					new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
						new TextInputBuilder().setCustomId('custom id').setLabel('label').setStyle(TextInputStyle.Paragraph),
					),
				])
				.toJSON(),
		).toEqual(modalData);
	});

	describe('equals()', () => {
		const textInput1 = new TextInputBuilder()
			.setCustomId('custom id')
			.setLabel('label')
			.setStyle(TextInputStyle.Paragraph);

		const textInput2: APITextInputComponent = {
			type: ComponentType.TextInput,
			custom_id: 'custom id',
			label: 'label',
			style: TextInputStyle.Paragraph,
		};

		test('GIVEN equal builders THEN returns true', () => {
			const equalTextInput = new TextInputBuilder()
				.setCustomId('custom id')
				.setLabel('label')
				.setStyle(TextInputStyle.Paragraph);

			expect(textInput1.equals(equalTextInput)).toBeTruthy();
		});

		test('GIVEN the same builder THEN returns true', () => {
			expect(textInput1.equals(textInput1)).toBeTruthy();
		});

		test('GIVEN equal builder and data THEN returns true', () => {
			expect(textInput1.equals(textInput2)).toBeTruthy();
		});

		test('GIVEN different builders THEN returns false', () => {
			const diffTextInput = new TextInputBuilder()
				.setCustomId('custom id')
				.setLabel('label 2')
				.setStyle(TextInputStyle.Paragraph);

			expect(textInput1.equals(diffTextInput)).toBeFalsy();
		});

		test('GIVEN different text input builder and data THEN returns false', () => {
			const diffTextInputData: APITextInputComponent = {
				type: ComponentType.TextInput,
				custom_id: 'custom id',
				label: 'label 2',
				style: TextInputStyle.Short,
			};

			expect(textInput1.equals(diffTextInputData)).toBeFalsy();
		});
	});
});

```

# packages\builders\__tests__\interactions\SlashCommands\Options.test.ts

```ts
import {
	ApplicationCommandOptionType,
	ChannelType,
	type APIApplicationCommandAttachmentOption,
	type APIApplicationCommandBooleanOption,
	type APIApplicationCommandChannelOption,
	type APIApplicationCommandIntegerOption,
	type APIApplicationCommandMentionableOption,
	type APIApplicationCommandNumberOption,
	type APIApplicationCommandRoleOption,
	type APIApplicationCommandStringOption,
	type APIApplicationCommandUserOption,
} from 'discord-api-types/v10';
import { describe, test, expect } from 'vitest';
import {
	SlashCommandAttachmentOption,
	SlashCommandBooleanOption,
	SlashCommandChannelOption,
	SlashCommandIntegerOption,
	SlashCommandMentionableOption,
	SlashCommandNumberOption,
	SlashCommandRoleOption,
	SlashCommandStringOption,
	SlashCommandUserOption,
} from '../../../src/index.js';

const getBooleanOption = () =>
	new SlashCommandBooleanOption().setName('owo').setDescription('Testing 123').setRequired(true);

const getChannelOption = () =>
	new SlashCommandChannelOption()
		.setName('owo')
		.setDescription('Testing 123')
		.setRequired(true)
		.addChannelTypes(ChannelType.GuildText);

const getStringOption = () =>
	new SlashCommandStringOption().setName('owo').setDescription('Testing 123').setRequired(true);

const getIntegerOption = () =>
	new SlashCommandIntegerOption()
		.setName('owo')
		.setDescription('Testing 123')
		.setRequired(true)
		.setMinValue(-1)
		.setMaxValue(10);

const getNumberOption = () =>
	new SlashCommandNumberOption()
		.setName('owo')
		.setDescription('Testing 123')
		.setRequired(true)
		.setMinValue(-1.23)
		.setMaxValue(10);

const getUserOption = () => new SlashCommandUserOption().setName('owo').setDescription('Testing 123').setRequired(true);

const getRoleOption = () => new SlashCommandRoleOption().setName('owo').setDescription('Testing 123').setRequired(true);

const getMentionableOption = () =>
	new SlashCommandMentionableOption().setName('owo').setDescription('Testing 123').setRequired(true);

const getAttachmentOption = () =>
	new SlashCommandAttachmentOption().setName('attachment').setDescription('attachment').setRequired(true);

describe('Application Command toJSON() results', () => {
	test('GIVEN a boolean option THEN calling toJSON should return a valid JSON', () => {
		expect(getBooleanOption().toJSON()).toEqual<APIApplicationCommandBooleanOption>({
			name: 'owo',
			description: 'Testing 123',
			type: ApplicationCommandOptionType.Boolean,
			required: true,
		});
	});

	test('GIVEN a channel option THEN calling toJSON should return a valid JSON', () => {
		expect(getChannelOption().toJSON()).toEqual<APIApplicationCommandChannelOption>({
			name: 'owo',
			description: 'Testing 123',
			type: ApplicationCommandOptionType.Channel,
			required: true,
			channel_types: [ChannelType.GuildText],
		});
	});

	test('GIVEN a integer option THEN calling toJSON should return a valid JSON', () => {
		expect(getIntegerOption().toJSON()).toEqual<APIApplicationCommandIntegerOption>({
			name: 'owo',
			description: 'Testing 123',
			type: ApplicationCommandOptionType.Integer,
			required: true,
			max_value: 10,
			min_value: -1,
		});

		expect(getIntegerOption().setAutocomplete(true).setChoices().toJSON()).toEqual<APIApplicationCommandIntegerOption>({
			name: 'owo',
			description: 'Testing 123',
			type: ApplicationCommandOptionType.Integer,
			required: true,
			max_value: 10,
			min_value: -1,
			autocomplete: true,
			// TODO
			choices: [],
		});

		expect(
			getIntegerOption().addChoices({ name: 'uwu', value: 1 }).toJSON(),
		).toEqual<APIApplicationCommandIntegerOption>({
			name: 'owo',
			description: 'Testing 123',
			type: ApplicationCommandOptionType.Integer,
			required: true,
			max_value: 10,
			min_value: -1,
			choices: [{ name: 'uwu', value: 1 }],
		});
	});

	test('GIVEN a mentionable option THEN calling toJSON should return a valid JSON', () => {
		expect(getMentionableOption().toJSON()).toEqual<APIApplicationCommandMentionableOption>({
			name: 'owo',
			description: 'Testing 123',
			type: ApplicationCommandOptionType.Mentionable,
			required: true,
		});
	});

	test('GIVEN a number option THEN calling toJSON should return a valid JSON', () => {
		expect(getNumberOption().toJSON()).toEqual<APIApplicationCommandNumberOption>({
			name: 'owo',
			description: 'Testing 123',
			type: ApplicationCommandOptionType.Number,
			required: true,
			max_value: 10,
			min_value: -1.23,
		});

		expect(getNumberOption().setAutocomplete(true).setChoices().toJSON()).toEqual<APIApplicationCommandNumberOption>({
			name: 'owo',
			description: 'Testing 123',
			type: ApplicationCommandOptionType.Number,
			required: true,
			max_value: 10,
			min_value: -1.23,
			autocomplete: true,
			// TODO
			choices: [],
		});

		expect(getNumberOption().addChoices({ name: 'uwu', value: 1 }).toJSON()).toEqual<APIApplicationCommandNumberOption>(
			{
				name: 'owo',
				description: 'Testing 123',
				type: ApplicationCommandOptionType.Number,
				required: true,
				max_value: 10,
				min_value: -1.23,
				choices: [{ name: 'uwu', value: 1 }],
			},
		);
	});

	test('GIVEN a role option THEN calling toJSON should return a valid JSON', () => {
		expect(getRoleOption().toJSON()).toEqual<APIApplicationCommandRoleOption>({
			name: 'owo',
			description: 'Testing 123',
			type: ApplicationCommandOptionType.Role,
			required: true,
		});
	});

	test('GIVEN a string option THEN calling toJSON should return a valid JSON', () => {
		expect(getStringOption().setMinLength(1).setMaxLength(10).toJSON()).toEqual<APIApplicationCommandStringOption>({
			name: 'owo',
			description: 'Testing 123',
			type: ApplicationCommandOptionType.String,
			required: true,
			max_length: 10,
			min_length: 1,
		});

		expect(getStringOption().setAutocomplete(true).setChoices().toJSON()).toEqual<APIApplicationCommandStringOption>({
			name: 'owo',
			description: 'Testing 123',
			type: ApplicationCommandOptionType.String,
			required: true,
			autocomplete: true,
			// TODO
			choices: [],
		});

		expect(
			getStringOption().addChoices({ name: 'uwu', value: '1' }).toJSON(),
		).toEqual<APIApplicationCommandStringOption>({
			name: 'owo',
			description: 'Testing 123',
			type: ApplicationCommandOptionType.String,
			required: true,
			choices: [{ name: 'uwu', value: '1' }],
		});
	});

	test('GIVEN a user option THEN calling toJSON should return a valid JSON', () => {
		expect(getUserOption().toJSON()).toEqual<APIApplicationCommandUserOption>({
			name: 'owo',
			description: 'Testing 123',
			type: ApplicationCommandOptionType.User,
			required: true,
		});
	});

	test('GIVEN an attachment option THEN calling toJSON should return a valid JSON', () => {
		expect(getAttachmentOption().toJSON()).toEqual<APIApplicationCommandAttachmentOption>({
			name: 'attachment',
			description: 'attachment',
			type: ApplicationCommandOptionType.Attachment,
			required: true,
		});
	});
});

```

# packages\builders\__tests__\interactions\SlashCommands\SlashCommands.test.ts

```ts
import {
	ApplicationIntegrationType,
	ChannelType,
	InteractionContextType,
	PermissionFlagsBits,
	type APIApplicationCommandOptionChoice,
} from 'discord-api-types/v10';
import { describe, test, expect } from 'vitest';
import {
	SlashCommandAssertions,
	SlashCommandBooleanOption,
	SlashCommandBuilder,
	SlashCommandChannelOption,
	SlashCommandIntegerOption,
	SlashCommandMentionableOption,
	SlashCommandNumberOption,
	SlashCommandRoleOption,
	SlashCommandAttachmentOption,
	SlashCommandStringOption,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
	SlashCommandUserOption,
} from '../../../src/index.js';

const largeArray = Array.from({ length: 26 }, () => 1 as unknown as APIApplicationCommandOptionChoice);

const getBuilder = () => new SlashCommandBuilder();
const getNamedBuilder = () => getBuilder().setName('example').setDescription('Example command');
const getStringOption = () => new SlashCommandStringOption().setName('owo').setDescription('Testing 123');
const getIntegerOption = () => new SlashCommandIntegerOption().setName('owo').setDescription('Testing 123');
const getNumberOption = () => new SlashCommandNumberOption().setName('owo').setDescription('Testing 123');
const getBooleanOption = () => new SlashCommandBooleanOption().setName('owo').setDescription('Testing 123');
const getUserOption = () => new SlashCommandUserOption().setName('owo').setDescription('Testing 123');
const getChannelOption = () => new SlashCommandChannelOption().setName('owo').setDescription('Testing 123');
const getRoleOption = () => new SlashCommandRoleOption().setName('owo').setDescription('Testing 123');
const getAttachmentOption = () => new SlashCommandAttachmentOption().setName('owo').setDescription('Testing 123');
const getMentionableOption = () => new SlashCommandMentionableOption().setName('owo').setDescription('Testing 123');
const getSubcommandGroup = () => new SlashCommandSubcommandGroupBuilder().setName('owo').setDescription('Testing 123');
const getSubcommand = () => new SlashCommandSubcommandBuilder().setName('owo').setDescription('Testing 123');

class Collection {
	public readonly [Symbol.toStringTag] = 'Map';
}

describe('Slash Commands', () => {
	describe('Assertions tests', () => {
		test('GIVEN valid name THEN does not throw error', () => {
			expect(() => SlashCommandAssertions.validateName('ping')).not.toThrowError();
			expect(() => SlashCommandAssertions.validateName('hello-world_command')).not.toThrowError();
			expect(() => SlashCommandAssertions.validateName('aˇ㐆1٢〣²अก')).not.toThrowError();
		});

		test('GIVEN invalid name THEN throw error', () => {
			expect(() => SlashCommandAssertions.validateName(null)).toThrowError();

			// Too short of a name
			expect(() => SlashCommandAssertions.validateName('')).toThrowError();

			// Invalid characters used
			expect(() => SlashCommandAssertions.validateName('ABC')).toThrowError();
			expect(() => SlashCommandAssertions.validateName('ABC123$%^&')).toThrowError();
			expect(() => SlashCommandAssertions.validateName('help ping')).toThrowError();
			expect(() => SlashCommandAssertions.validateName('🦦')).toThrowError();

			// Too long of a name
			expect(() =>
				SlashCommandAssertions.validateName('qwertyuiopasdfghjklzxcvbnmqwertyuiopasdfghjklzxcvbnm'),
			).toThrowError();
		});

		test('GIVEN valid description THEN does not throw error', () => {
			expect(() => SlashCommandAssertions.validateDescription('This is an OwO moment fur sure!~')).not.toThrowError();
		});

		test('GIVEN invalid description THEN throw error', () => {
			expect(() => SlashCommandAssertions.validateDescription(null)).toThrowError();

			// Too short of a description
			expect(() => SlashCommandAssertions.validateDescription('')).toThrowError();

			// Too long of a description
			expect(() =>
				SlashCommandAssertions.validateDescription(
					'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Magnam autem libero expedita vitae accusamus nostrum ipsam tempore repudiandae deserunt ipsum facilis, velit fugiat facere accusantium, explicabo corporis aliquam non quos.',
				),
			).toThrowError();
		});

		test('GIVEN valid default_permission THEN does not throw error', () => {
			expect(() => SlashCommandAssertions.validateDefaultPermission(true)).not.toThrowError();
		});

		test('GIVEN invalid default_permission THEN throw error', () => {
			expect(() => SlashCommandAssertions.validateDefaultPermission(null)).toThrowError();
		});

		test('GIVEN valid array of options or choices THEN does not throw error', () => {
			expect(() => SlashCommandAssertions.validateMaxOptionsLength([])).not.toThrowError();

			expect(() => SlashCommandAssertions.validateChoicesLength(25)).not.toThrowError();
			expect(() => SlashCommandAssertions.validateChoicesLength(25, [])).not.toThrowError();
		});

		test('GIVEN invalid options or choices THEN throw error', () => {
			expect(() => SlashCommandAssertions.validateMaxOptionsLength(null)).toThrowError();

			// Given an array that's too big
			expect(() => SlashCommandAssertions.validateMaxOptionsLength(largeArray)).toThrowError();

			expect(() => SlashCommandAssertions.validateChoicesLength(1, largeArray)).toThrowError();
		});

		test('GIVEN valid required parameters THEN does not throw error', () => {
			expect(() =>
				SlashCommandAssertions.validateRequiredParameters(
					'owo',
					'My fancy command that totally exists, to test assertions',
					[],
				),
			).not.toThrowError();
		});
	});

	describe('SlashCommandBuilder', () => {
		describe('Builder with no options', () => {
			test('GIVEN empty builder THEN throw error when calling toJSON', () => {
				expect(() => getBuilder().toJSON()).toThrowError();
			});

			test('GIVEN valid builder THEN does not throw error', () => {
				expect(() => getBuilder().setName('example').setDescription('Example command').toJSON()).not.toThrowError();
			});
		});

		describe('Builder with simple options', () => {
			test('GIVEN valid builder with options THEN does not throw error', () => {
				expect(() =>
					getBuilder()
						.setName('example')
						.setDescription('Example command')
						.setDMPermission(false)
						.addBooleanOption((boolean) =>
							boolean.setName('iscool').setDescription('Are we cool or what?').setRequired(true),
						)
						.addChannelOption((channel) => channel.setName('iscool').setDescription('Are we cool or what?'))
						.addMentionableOption((mentionable) => mentionable.setName('iscool').setDescription('Are we cool or what?'))
						.addRoleOption((role) => role.setName('iscool').setDescription('Are we cool or what?'))
						.addUserOption((user) => user.setName('iscool').setDescription('Are we cool or what?'))
						.addIntegerOption((integer) =>
							integer
								.setName('iscool')
								.setDescription('Are we cool or what?')
								.addChoices({ name: 'Very cool', value: 1_000 })
								.addChoices([{ name: 'Even cooler', value: 2_000 }]),
						)
						.addNumberOption((number) =>
							number
								.setName('iscool')
								.setDescription('Are we cool or what?')
								.addChoices({ name: 'Very cool', value: 1.5 })
								.addChoices([{ name: 'Even cooler', value: 2.5 }]),
						)
						.addStringOption((string) =>
							string
								.setName('iscool')
								.setDescription('Are we cool or what?')
								.addChoices({ name: 'Fancy Pants', value: 'fp_1' }, { name: 'Fancy Shoes', value: 'fs_1' })
								.addChoices([{ name: 'The Whole shebang', value: 'all' }]),
						)
						.addIntegerOption((integer) =>
							integer.setName('iscool').setDescription('Are we cool or what?').setAutocomplete(true),
						)
						.addNumberOption((number) =>
							number.setName('iscool').setDescription('Are we cool or what?').setAutocomplete(true),
						)
						.addStringOption((string) =>
							string.setName('iscool').setDescription('Are we cool or what?').setAutocomplete(true),
						)
						.toJSON(),
				).not.toThrowError();
			});

			test('GIVEN a builder with invalid autocomplete THEN does throw an error', () => {
				// @ts-expect-error: Checking if not providing anything, or an invalid return type causes an error
				expect(() => getBuilder().addStringOption(getStringOption().setAutocomplete('not a boolean'))).toThrowError();
			});

			test('GIVEN a builder with both choices and autocomplete THEN does throw an error', () => {
				expect(() =>
					getBuilder().addStringOption(
						getStringOption().setAutocomplete(true).addChoices({ name: 'Fancy Pants', value: 'fp_1' }),
					),
				).toThrowError();

				expect(() =>
					getBuilder().addStringOption(
						getStringOption()
							.setAutocomplete(true)
							.addChoices(
								{ name: 'Fancy Pants', value: 'fp_1' },
								{ name: 'Fancy Shoes', value: 'fs_1' },
								{ name: 'The Whole shebang', value: 'all' },
							),
					),
				).toThrowError();

				expect(() =>
					getBuilder().addStringOption(
						getStringOption().addChoices({ name: 'Fancy Pants', value: 'fp_1' }).setAutocomplete(true),
					),
				).toThrowError();

				expect(() => {
					const option = getStringOption();
					Reflect.set(option, 'autocomplete', true);
					Reflect.set(option, 'choices', [{ name: 'Fancy Pants', value: 'fp_1' }]);
					return option.toJSON();
				}).toThrowError();

				expect(() => {
					const option = getNumberOption();
					Reflect.set(option, 'autocomplete', true);
					Reflect.set(option, 'choices', [{ name: 'Fancy Pants', value: 'fp_1' }]);
					return option.toJSON();
				}).toThrowError();

				expect(() => {
					const option = getIntegerOption();
					Reflect.set(option, 'autocomplete', true);
					Reflect.set(option, 'choices', [{ name: 'Fancy Pants', value: 'fp_1' }]);
					return option.toJSON();
				}).toThrowError();
			});

			test('GIVEN a builder with valid channel options and channel_types THEN does not throw an error', () => {
				expect(() =>
					getBuilder().addChannelOption(
						getChannelOption().addChannelTypes(ChannelType.GuildText).addChannelTypes([ChannelType.GuildVoice]),
					),
				).not.toThrowError();

				expect(() => {
					getBuilder().addChannelOption(
						getChannelOption().addChannelTypes(ChannelType.GuildAnnouncement, ChannelType.GuildText),
					);
				}).not.toThrowError();
			});

			test('GIVEN a builder with valid channel options and channel_types THEN does throw an error', () => {
				// @ts-expect-error: Invalid channel type
				expect(() => getBuilder().addChannelOption(getChannelOption().addChannelTypes(100))).toThrowError();

				// @ts-expect-error: Invalid channel types
				expect(() => getBuilder().addChannelOption(getChannelOption().addChannelTypes(100, 200))).toThrowError();
			});

			test('GIVEN a builder with invalid number min/max options THEN does throw an error', () => {
				// @ts-expect-error: Invalid max value
				expect(() => getBuilder().addNumberOption(getNumberOption().setMaxValue('test'))).toThrowError();

				// @ts-expect-error: Invalid max value
				expect(() => getBuilder().addIntegerOption(getIntegerOption().setMaxValue('test'))).toThrowError();

				// @ts-expect-error: Invalid min value
				expect(() => getBuilder().addNumberOption(getNumberOption().setMinValue('test'))).toThrowError();

				// @ts-expect-error: Invalid min value
				expect(() => getBuilder().addIntegerOption(getIntegerOption().setMinValue('test'))).toThrowError();

				expect(() => getBuilder().addIntegerOption(getIntegerOption().setMinValue(1.5))).toThrowError();
			});

			test('GIVEN a builder with valid number min/max options THEN does not throw an error', () => {
				expect(() => getBuilder().addIntegerOption(getIntegerOption().setMinValue(1))).not.toThrowError();

				expect(() => getBuilder().addNumberOption(getNumberOption().setMinValue(1.5))).not.toThrowError();

				expect(() => getBuilder().addIntegerOption(getIntegerOption().setMaxValue(1))).not.toThrowError();

				expect(() => getBuilder().addNumberOption(getNumberOption().setMaxValue(1.5))).not.toThrowError();
			});

			test('GIVEN an already built builder THEN does not throw an error', () => {
				expect(() => getBuilder().addStringOption(getStringOption())).not.toThrowError();

				expect(() => getBuilder().addIntegerOption(getIntegerOption())).not.toThrowError();

				expect(() => getBuilder().addNumberOption(getNumberOption())).not.toThrowError();

				expect(() => getBuilder().addBooleanOption(getBooleanOption())).not.toThrowError();

				expect(() => getBuilder().addUserOption(getUserOption())).not.toThrowError();

				expect(() => getBuilder().addChannelOption(getChannelOption())).not.toThrowError();

				expect(() => getBuilder().addRoleOption(getRoleOption())).not.toThrowError();

				expect(() => getBuilder().addAttachmentOption(getAttachmentOption())).not.toThrowError();

				expect(() => getBuilder().addMentionableOption(getMentionableOption())).not.toThrowError();
			});

			test('GIVEN no valid return for an addOption method THEN throw error', () => {
				// @ts-expect-error: Checking if not providing anything, or an invalid return type causes an error
				expect(() => getBuilder().addBooleanOption()).toThrowError();

				// @ts-expect-error: Checking if not providing anything, or an invalid return type causes an error
				expect(() => getBuilder().addBooleanOption(getRoleOption())).toThrowError();
			});

			test('GIVEN invalid name THEN throw error', () => {
				expect(() => getBuilder().setName('TEST_COMMAND')).toThrowError();

				expect(() => getBuilder().setName('ĂĂĂĂĂĂ')).toThrowError();
			});

			test('GIVEN valid names THEN does not throw error', () => {
				expect(() => getBuilder().setName('hi_there')).not.toThrowError();

				// Translation: a_command
				expect(() => getBuilder().setName('o_comandă')).not.toThrowError();

				// Translation: thx (according to GTranslate)
				expect(() => getBuilder().setName('どうも')).not.toThrowError();
			});

			test('GIVEN invalid returns for builder THEN throw error', () => {
				// @ts-expect-error: Checking if not providing anything, or an invalid return type causes an error
				expect(() => getBuilder().addBooleanOption(true)).toThrowError();

				// @ts-expect-error: Checking if not providing anything, or an invalid return type causes an error
				expect(() => getBuilder().addBooleanOption(null)).toThrowError();

				// @ts-expect-error: Checking if not providing anything, or an invalid return type causes an error
				expect(() => getBuilder().addBooleanOption(undefined)).toThrowError();

				// @ts-expect-error: Checking if not providing anything, or an invalid return type causes an error
				expect(() => getBuilder().addBooleanOption(() => SlashCommandStringOption)).toThrowError();
				// @ts-expect-error: Checking if not providing anything, or an invalid return type causes an error
				expect(() => getBuilder().addBooleanOption(() => new Collection())).toThrowError();
			});

			test('GIVEN valid builder with defaultPermission false THEN does not throw error', () => {
				expect(() => getBuilder().setName('foo').setDescription('foo').setDefaultPermission(false)).not.toThrowError();
			});

			test('GIVEN an option that is autocompletable and has choices, THEN passing nothing to setChoices should not throw an error', () => {
				expect(() =>
					getBuilder().addStringOption(getStringOption().setAutocomplete(true).setChoices()),
				).not.toThrowError();
			});

			test('GIVEN an option that is autocompletable, THEN setting choices should throw an error', () => {
				expect(() =>
					getBuilder().addStringOption(
						getStringOption().setAutocomplete(true).setChoices({ name: 'owo', value: 'uwu' }),
					),
				).toThrowError();
			});

			test('GIVEN an option, THEN setting choices should not throw an error', () => {
				expect(() =>
					getBuilder().addStringOption(getStringOption().setChoices({ name: 'owo', value: 'uwu' })),
				).not.toThrowError();
			});

			test('GIVEN valid builder with NSFW, THEN does not throw error', () => {
				expect(() => getBuilder().setName('foo').setDescription('foo').setNSFW(true)).not.toThrowError();
			});
		});

		describe('Builder with subcommand (group) options', () => {
			test('GIVEN builder with subcommand group THEN does not throw error', () => {
				expect(() =>
					getNamedBuilder().addSubcommandGroup((group) => group.setName('group').setDescription('Group us together!')),
				).not.toThrowError();
			});

			test('GIVEN builder with subcommand THEN does not throw error', () => {
				expect(() =>
					getNamedBuilder().addSubcommand((subcommand) =>
						subcommand.setName('boop').setDescription('Boops a fellow nerd (you)'),
					),
				).not.toThrowError();
			});

			test('GIVEN builder with subcommand THEN has regular slash command fields', () => {
				expect(() =>
					getBuilder()
						.setName('name')
						.setDescription('description')
						.addSubcommand((option) => option.setName('ye').setDescription('ye'))
						.addSubcommand((option) => option.setName('no').setDescription('no'))
						.setDMPermission(false)
						.setDefaultMemberPermissions(1n),
				).not.toThrowError();
			});

			test('GIVEN builder with already built subcommand group THEN does not throw error', () => {
				expect(() => getNamedBuilder().addSubcommandGroup(getSubcommandGroup())).not.toThrowError();
			});

			test('GIVEN builder with already built subcommand THEN does not throw error', () => {
				expect(() => getNamedBuilder().addSubcommand(getSubcommand())).not.toThrowError();
			});

			test('GIVEN builder with already built subcommand with options THEN does not throw error', () => {
				expect(() =>
					getNamedBuilder().addSubcommand(getSubcommand().addBooleanOption(getBooleanOption())),
				).not.toThrowError();
			});

			test('GIVEN builder with a subcommand that tries to add an invalid result THEN throw error', () => {
				expect(() =>
					// @ts-expect-error: Checking if check works JS-side too
					getNamedBuilder().addSubcommand(getSubcommand()).addInteger(getInteger()),
				).toThrowError();
			});

			test('GIVEN no valid return for an addSubcommand(Group) method THEN throw error', () => {
				// @ts-expect-error: Checking if not providing anything, or an invalid return type causes an error
				expect(() => getBuilder().addSubcommandGroup()).toThrowError();

				// @ts-expect-error: Checking if not providing anything, or an invalid return type causes an error
				expect(() => getBuilder().addSubcommand()).toThrowError();

				// @ts-expect-error: Checking if not providing anything, or an invalid return type causes an error
				expect(() => getBuilder().addSubcommand(getSubcommandGroup())).toThrowError();
			});
		});

		describe('Subcommand group builder', () => {
			test('GIVEN no valid subcommand THEN throw error', () => {
				// @ts-expect-error: Checking if not providing anything, or an invalid return type causes an error
				expect(() => getSubcommandGroup().addSubcommand()).toThrowError();

				// @ts-expect-error: Checking if not providing anything, or an invalid return type causes an error
				expect(() => getSubcommandGroup().addSubcommand(getSubcommandGroup())).toThrowError();
			});

			test('GIVEN a valid subcommand THEN does not throw an error', () => {
				expect(() =>
					getSubcommandGroup()
						.addSubcommand((sub) => sub.setName('sub').setDescription('Testing 123'))
						.toJSON(),
				).not.toThrowError();
			});
		});

		describe('Subcommand builder', () => {
			test('GIVEN a valid subcommand with options THEN does not throw error', () => {
				expect(() => getSubcommand().addBooleanOption(getBooleanOption()).toJSON()).not.toThrowError();
			});
		});

		describe('Slash command localizations', () => {
			const expectedSingleLocale = { 'en-US': 'foobar' };
			const expectedMultipleLocales = {
				...expectedSingleLocale,
				bg: 'test',
			};

			test('GIVEN valid name localizations THEN does not throw error', () => {
				expect(() => getBuilder().setNameLocalization('en-US', 'foobar')).not.toThrowError();
				expect(() => getBuilder().setNameLocalizations({ 'en-US': 'foobar' })).not.toThrowError();
			});

			test('GIVEN invalid name localizations THEN does throw error', () => {
				// @ts-expect-error: Invalid localization
				expect(() => getBuilder().setNameLocalization('en-U', 'foobar')).toThrowError();
				// @ts-expect-error: Invalid localization
				expect(() => getBuilder().setNameLocalizations({ 'en-U': 'foobar' })).toThrowError();
			});

			test('GIVEN valid name localizations THEN valid data is stored', () => {
				expect(getBuilder().setNameLocalization('en-US', 'foobar').name_localizations).toEqual(expectedSingleLocale);
				expect(getBuilder().setNameLocalizations({ 'en-US': 'foobar', bg: 'test' }).name_localizations).toEqual(
					expectedMultipleLocales,
				);
				expect(getBuilder().setNameLocalizations(null).name_localizations).toBeNull();
				expect(getBuilder().setNameLocalization('en-US', null).name_localizations).toEqual({
					'en-US': null,
				});
			});

			test('GIVEN valid description localizations THEN does not throw error', () => {
				expect(() => getBuilder().setDescriptionLocalization('en-US', 'foobar')).not.toThrowError();
				expect(() => getBuilder().setDescriptionLocalizations({ 'en-US': 'foobar' })).not.toThrowError();
			});

			test('GIVEN invalid description localizations THEN does throw error', () => {
				// @ts-expect-error: Invalid localization description
				expect(() => getBuilder().setDescriptionLocalization('en-U', 'foobar')).toThrowError();
				// @ts-expect-error: Invalid localization description
				expect(() => getBuilder().setDescriptionLocalizations({ 'en-U': 'foobar' })).toThrowError();
			});

			test('GIVEN valid description localizations THEN valid data is stored', () => {
				expect(getBuilder().setDescriptionLocalization('en-US', 'foobar').description_localizations).toEqual(
					expectedSingleLocale,
				);
				expect(
					getBuilder().setDescriptionLocalizations({ 'en-US': 'foobar', bg: 'test' }).description_localizations,
				).toEqual(expectedMultipleLocales);
				expect(getBuilder().setDescriptionLocalizations(null).description_localizations).toBeNull();
				expect(getBuilder().setDescriptionLocalization('en-US', null).description_localizations).toEqual({
					'en-US': null,
				});
			});
		});

		describe('permissions', () => {
			test('GIVEN valid permission string THEN does not throw error', () => {
				expect(() => getBuilder().setDefaultMemberPermissions('1')).not.toThrowError();
			});

			test('GIVEN valid permission bitfield THEN does not throw error', () => {
				expect(() =>
					getBuilder().setDefaultMemberPermissions(PermissionFlagsBits.AddReactions | PermissionFlagsBits.AttachFiles),
				).not.toThrowError();
			});

			test('GIVEN null permissions THEN does not throw error', () => {
				expect(() => getBuilder().setDefaultMemberPermissions(null)).not.toThrowError();
			});

			test('GIVEN invalid inputs THEN does throw error', () => {
				expect(() => getBuilder().setDefaultMemberPermissions('1.1')).toThrowError();

				expect(() => getBuilder().setDefaultMemberPermissions(1.1)).toThrowError();
			});

			test('GIVEN valid permission with options THEN does not throw error', () => {
				expect(() =>
					getBuilder().addBooleanOption(getBooleanOption()).setDefaultMemberPermissions('1'),
				).not.toThrowError();

				expect(() => getBuilder().addChannelOption(getChannelOption()).setDMPermission(false)).not.toThrowError();
			});
		});

		describe('contexts', () => {
			test('GIVEN a builder with valid contexts THEN does not throw an error', () => {
				expect(() =>
					getBuilder().setContexts([InteractionContextType.Guild, InteractionContextType.BotDM]),
				).not.toThrowError();

				expect(() =>
					getBuilder().setContexts(InteractionContextType.Guild, InteractionContextType.BotDM),
				).not.toThrowError();
			});

			test('GIVEN a builder with invalid contexts THEN does throw an error', () => {
				// @ts-expect-error: Invalid contexts
				expect(() => getBuilder().setContexts(999)).toThrowError();

				// @ts-expect-error: Invalid contexts
				expect(() => getBuilder().setContexts([999, 998])).toThrowError();
			});
		});

		describe('integration types', () => {
			test('GIVEN a builder with valid integraton types THEN does not throw an error', () => {
				expect(() =>
					getBuilder().setIntegrationTypes([
						ApplicationIntegrationType.GuildInstall,
						ApplicationIntegrationType.UserInstall,
					]),
				).not.toThrowError();

				expect(() =>
					getBuilder().setIntegrationTypes(
						ApplicationIntegrationType.GuildInstall,
						ApplicationIntegrationType.UserInstall,
					),
				).not.toThrowError();
			});

			test('GIVEN a builder with invalid integration types THEN does throw an error', () => {
				// @ts-expect-error: Invalid integration types
				expect(() => getBuilder().setIntegrationTypes(999)).toThrowError();

				// @ts-expect-error: Invalid integration types
				expect(() => getBuilder().setIntegrationTypes([999, 998])).toThrowError();
			});
		});
	});
});

```

# packages\builders\__tests__\messages\embed.test.ts

```ts
import { describe, test, expect } from 'vitest';
import { EmbedBuilder, embedLength } from '../../src/index.js';

const alpha = 'abcdefghijklmnopqrstuvwxyz';

describe('Embed', () => {
	describe('Embed getters', () => {
		test('GIVEN an embed with specific amount of characters THEN returns amount of characters', () => {
			const embed = new EmbedBuilder({
				title: alpha,
				description: alpha,
				fields: [{ name: alpha, value: alpha }],
				author: { name: alpha },
				footer: { text: alpha },
			});

			expect(embedLength(embed.data)).toEqual(alpha.length * 6);
		});

		test('GIVEN an embed with zero characters THEN returns amount of characters', () => {
			const embed = new EmbedBuilder();

			expect(embedLength(embed.data)).toEqual(0);
		});
	});

	describe('Embed title', () => {
		test('GIVEN an embed with a pre-defined title THEN return valid toJSON data', () => {
			const embed = new EmbedBuilder({ title: 'foo' });
			expect(embed.toJSON()).toStrictEqual({ title: 'foo' });
		});

		test('GIVEN an embed using Embed#setTitle THEN return valid toJSON data', () => {
			const embed = new EmbedBuilder();
			embed.setTitle('foo');

			expect(embed.toJSON()).toStrictEqual({ title: 'foo' });
		});

		test('GIVEN an embed with a pre-defined title THEN unset title THEN return valid toJSON data', () => {
			const embed = new EmbedBuilder({ title: 'foo' });
			embed.setTitle(null);

			expect(embed.toJSON()).toStrictEqual({ title: undefined });
		});

		test('GIVEN an embed with an invalid title THEN throws error', () => {
			const embed = new EmbedBuilder();

			expect(() => embed.setTitle('a'.repeat(257))).toThrowError();
		});
	});

	describe('Embed description', () => {
		test('GIVEN an embed with a pre-defined description THEN return valid toJSON data', () => {
			const embed = new EmbedBuilder({ description: 'foo' });
			expect(embed.toJSON()).toStrictEqual({ description: 'foo' });
		});

		test('GIVEN an embed using Embed#setDescription THEN return valid toJSON data', () => {
			const embed = new EmbedBuilder();
			embed.setDescription('foo');

			expect(embed.toJSON()).toStrictEqual({ description: 'foo' });
		});

		test('GIVEN an embed with a pre-defined description THEN unset description THEN return valid toJSON data', () => {
			const embed = new EmbedBuilder({ description: 'foo' });
			embed.setDescription(null);

			expect(embed.toJSON()).toStrictEqual({ description: undefined });
		});

		test('GIVEN an embed with an invalid description THEN throws error', () => {
			const embed = new EmbedBuilder();

			expect(() => embed.setDescription('a'.repeat(4_097))).toThrowError();
		});
	});

	describe('Embed URL', () => {
		test('GIVEN an embed with a pre-defined url THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder({ url: 'https://discord.js.org/' });
			expect(embed.toJSON()).toStrictEqual({
				url: 'https://discord.js.org/',
			});
		});

		test('GIVEN an embed using Embed#setURL THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder();
			embed.setURL('https://discord.js.org/');

			expect(embed.toJSON()).toStrictEqual({
				url: 'https://discord.js.org/',
			});
		});

		test('GIVEN an embed with a pre-defined title THEN unset title THEN return valid toJSON data', () => {
			const embed = new EmbedBuilder({ url: 'https://discord.js.org' });
			embed.setURL(null);

			expect(embed.toJSON()).toStrictEqual({ url: undefined });
		});

		test.each(['owo', 'discord://user'])('GIVEN an embed with an invalid URL THEN throws error', (input) => {
			const embed = new EmbedBuilder();

			expect(() => embed.setURL(input)).toThrowError();
		});
	});

	describe('Embed Color', () => {
		test('GIVEN an embed with a pre-defined color THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder({ color: 0xff0000 });
			expect(embed.toJSON()).toStrictEqual({ color: 0xff0000 });
		});

		test('GIVEN an embed using Embed#setColor THEN returns valid toJSON data', () => {
			expect(new EmbedBuilder().setColor(0xff0000).toJSON()).toStrictEqual({ color: 0xff0000 });
			expect(new EmbedBuilder().setColor([242, 66, 245]).toJSON()).toStrictEqual({ color: 0xf242f5 });
		});

		test('GIVEN an embed with a pre-defined color THEN unset color THEN return valid toJSON data', () => {
			const embed = new EmbedBuilder({ color: 0xff0000 });
			embed.setColor(null);

			expect(embed.toJSON()).toStrictEqual({ color: undefined });
		});

		test('GIVEN an embed with an invalid color THEN throws error', () => {
			const embed = new EmbedBuilder();

			// @ts-expect-error: Invalid color
			expect(() => embed.setColor('RED')).toThrowError();
			// @ts-expect-error: Invalid color
			expect(() => embed.setColor([42, 36])).toThrowError();
			expect(() => embed.setColor([42, 36, 1_000])).toThrowError();
		});
	});

	describe('Embed Timestamp', () => {
		const now = new Date();

		test('GIVEN an embed with a pre-defined timestamp THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder({ timestamp: now.toISOString() });
			expect(embed.toJSON()).toStrictEqual({ timestamp: now.toISOString() });
		});

		test('given an embed using Embed#setTimestamp (with Date) THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder();
			embed.setTimestamp(now);

			expect(embed.toJSON()).toStrictEqual({ timestamp: now.toISOString() });
		});

		test('GIVEN an embed using Embed#setTimestamp (with int) THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder();
			embed.setTimestamp(now.getTime());

			expect(embed.toJSON()).toStrictEqual({ timestamp: now.toISOString() });
		});

		test('GIVEN an embed using Embed#setTimestamp (default) THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder();
			embed.setTimestamp();

			expect(embed.toJSON()).toStrictEqual({ timestamp: embed.data.timestamp });
		});

		test('GIVEN an embed with a pre-defined timestamp THEN unset timestamp THEN return valid toJSON data', () => {
			const embed = new EmbedBuilder({ timestamp: now.toISOString() });
			embed.setTimestamp(null);

			expect(embed.toJSON()).toStrictEqual({ timestamp: undefined });
		});
	});

	describe('Embed Thumbnail', () => {
		test('GIVEN an embed with a pre-defined thumbnail THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder({ thumbnail: { url: 'https://discord.js.org/static/logo.svg' } });
			expect(embed.toJSON()).toStrictEqual({
				thumbnail: { url: 'https://discord.js.org/static/logo.svg' },
			});
		});

		test('GIVEN an embed using Embed#setThumbnail THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder();
			embed.setThumbnail('https://discord.js.org/static/logo.svg');

			expect(embed.toJSON()).toStrictEqual({
				thumbnail: { url: 'https://discord.js.org/static/logo.svg' },
			});
		});

		test('GIVEN an embed with a pre-defined thumbnail THEN unset thumbnail THEN return valid toJSON data', () => {
			const embed = new EmbedBuilder({ thumbnail: { url: 'https://discord.js.org/static/logo.svg' } });
			embed.setThumbnail(null);

			expect(embed.toJSON()).toStrictEqual({ thumbnail: undefined });
		});

		test('GIVEN an embed with an invalid thumbnail THEN throws error', () => {
			const embed = new EmbedBuilder();

			expect(() => embed.setThumbnail('owo')).toThrowError();
		});
	});

	describe('Embed Image', () => {
		test('GIVEN an embed with a pre-defined image THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder({ image: { url: 'https://discord.js.org/static/logo.svg' } });
			expect(embed.toJSON()).toStrictEqual({
				image: { url: 'https://discord.js.org/static/logo.svg' },
			});
		});

		test('GIVEN an embed using Embed#setImage THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder();
			embed.setImage('https://discord.js.org/static/logo.svg');

			expect(embed.toJSON()).toStrictEqual({
				image: { url: 'https://discord.js.org/static/logo.svg' },
			});
		});

		test('GIVEN an embed with a pre-defined image THEN unset image THEN return valid toJSON data', () => {
			const embed = new EmbedBuilder({ image: { url: 'https://discord.js/org/static/logo.svg' } });
			embed.setImage(null);

			expect(embed.toJSON()).toStrictEqual({ image: undefined });
		});

		test('GIVEN an embed with an invalid image THEN throws error', () => {
			const embed = new EmbedBuilder();

			expect(() => embed.setImage('owo')).toThrowError();
		});
	});

	describe('Embed Author', () => {
		test('GIVEN an embed with a pre-defined author THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder({
				author: { name: 'Wumpus', icon_url: 'https://discord.js.org/static/logo.svg', url: 'https://discord.js.org' },
			});
			expect(embed.toJSON()).toStrictEqual({
				author: { name: 'Wumpus', icon_url: 'https://discord.js.org/static/logo.svg', url: 'https://discord.js.org' },
			});
		});

		test('GIVEN an embed using Embed#setAuthor THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder();
			embed.setAuthor({
				name: 'Wumpus',
				iconURL: 'https://discord.js.org/static/logo.svg',
				url: 'https://discord.js.org',
			});

			expect(embed.toJSON()).toStrictEqual({
				author: { name: 'Wumpus', icon_url: 'https://discord.js.org/static/logo.svg', url: 'https://discord.js.org' },
			});
		});

		test('GIVEN an embed with a pre-defined author THEN unset author THEN return valid toJSON data', () => {
			const embed = new EmbedBuilder({
				author: { name: 'Wumpus', icon_url: 'https://discord.js.org/static/logo.svg', url: 'https://discord.js.org' },
			});
			embed.setAuthor(null);

			expect(embed.toJSON()).toStrictEqual({ author: undefined });
		});

		test('GIVEN an embed with an invalid author name THEN throws error', () => {
			const embed = new EmbedBuilder();

			expect(() => embed.setAuthor({ name: 'a'.repeat(257) })).toThrowError();
		});
	});

	describe('Embed Footer', () => {
		test('GIVEN an embed with a pre-defined footer THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder({
				footer: { text: 'Wumpus', icon_url: 'https://discord.js.org/static/logo.svg' },
			});
			expect(embed.toJSON()).toStrictEqual({
				footer: { text: 'Wumpus', icon_url: 'https://discord.js.org/static/logo.svg' },
			});
		});

		test('GIVEN an embed using Embed#setAuthor THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder();
			embed.setFooter({ text: 'Wumpus', iconURL: 'https://discord.js.org/static/logo.svg' });

			expect(embed.toJSON()).toStrictEqual({
				footer: { text: 'Wumpus', icon_url: 'https://discord.js.org/static/logo.svg' },
			});
		});

		test('GIVEN an embed with a pre-defined footer THEN unset footer THEN return valid toJSON data', () => {
			const embed = new EmbedBuilder({
				footer: { text: 'Wumpus', icon_url: 'https://discord.js.org/static/logo.svg' },
			});
			embed.setFooter(null);

			expect(embed.toJSON()).toStrictEqual({ footer: undefined });
		});

		test('GIVEN an embed with invalid footer text THEN throws error', () => {
			const embed = new EmbedBuilder();

			expect(() => embed.setFooter({ text: 'a'.repeat(2_049) })).toThrowError();
		});
	});

	describe('Embed Fields', () => {
		test('GIVEN an embed with a pre-defined field THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder({
				fields: [{ name: 'foo', value: 'bar' }],
			});
			expect(embed.toJSON()).toStrictEqual({
				fields: [{ name: 'foo', value: 'bar' }],
			});
		});

		test('GIVEN an embed using Embed#addFields THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder();
			embed.addFields({ name: 'foo', value: 'bar' });
			embed.addFields([{ name: 'foo', value: 'bar' }]);

			expect(embed.toJSON()).toStrictEqual({
				fields: [
					{ name: 'foo', value: 'bar' },
					{ name: 'foo', value: 'bar' },
				],
			});
		});

		test('GIVEN an embed using Embed#spliceFields THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder();
			embed.addFields({ name: 'foo', value: 'bar' }, { name: 'foo', value: 'baz' });

			expect(embed.spliceFields(0, 1).toJSON()).toStrictEqual({
				fields: [{ name: 'foo', value: 'baz' }],
			});
		});

		test('GIVEN an embed using Embed#spliceFields THEN returns valid toJSON data 2', () => {
			const embed = new EmbedBuilder();
			embed.addFields(...Array.from({ length: 23 }, () => ({ name: 'foo', value: 'bar' })));

			expect(() =>
				embed.spliceFields(0, 3, ...Array.from({ length: 5 }, () => ({ name: 'foo', value: 'bar' }))),
			).not.toThrowError();
		});

		test('GIVEN an embed using Embed#spliceFields that adds additional fields resulting in fields > 25 THEN throws error', () => {
			const embed = new EmbedBuilder();
			embed.addFields(...Array.from({ length: 23 }, () => ({ name: 'foo', value: 'bar' })));

			expect(() =>
				embed.spliceFields(0, 3, ...Array.from({ length: 8 }, () => ({ name: 'foo', value: 'bar' }))),
			).toThrowError();
		});

		test('GIVEN an embed using Embed#setFields THEN returns valid toJSON data', () => {
			const embed = new EmbedBuilder();

			expect(() =>
				embed.setFields(...Array.from({ length: 25 }, () => ({ name: 'foo', value: 'bar' }))),
			).not.toThrowError();
			expect(() =>
				embed.setFields(Array.from({ length: 25 }, () => ({ name: 'foo', value: 'bar' }))),
			).not.toThrowError();
		});

		test('GIVEN an embed using Embed#setFields that sets more than 25 fields THEN throws error', () => {
			const embed = new EmbedBuilder();

			expect(() =>
				embed.setFields(...Array.from({ length: 26 }, () => ({ name: 'foo', value: 'bar' }))),
			).toThrowError();
			expect(() => embed.setFields(Array.from({ length: 26 }, () => ({ name: 'foo', value: 'bar' })))).toThrowError();
		});

		describe('GIVEN invalid field amount THEN throws error', () => {
			test('1', () => {
				const embed = new EmbedBuilder();

				expect(() =>
					embed.addFields(...Array.from({ length: 26 }, () => ({ name: 'foo', value: 'bar' }))),
				).toThrowError();
			});
		});

		describe('GIVEN invalid field name THEN throws error', () => {
			test('2', () => {
				const embed = new EmbedBuilder();

				expect(() => embed.addFields({ name: '', value: 'bar' })).toThrowError();
			});
		});

		describe('GIVEN invalid field name length THEN throws error', () => {
			test('3', () => {
				const embed = new EmbedBuilder();

				expect(() => embed.addFields({ name: 'a'.repeat(257), value: 'bar' })).toThrowError();
			});
		});

		describe('GIVEN invalid field value length THEN throws error', () => {
			test('4', () => {
				const embed = new EmbedBuilder();

				expect(() => embed.addFields({ name: '', value: 'a'.repeat(1_025) })).toThrowError();
			});
		});
	});
});

```

# packages\builders\__tests__\types.test.ts

```ts
import { expectTypeOf } from 'vitest';
import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from '../src/index.js';

const getBuilder = () => new SlashCommandBuilder();
const getStringOption = () => new SlashCommandStringOption().setName('owo').setDescription('Testing 123');
const getSubcommand = () => new SlashCommandSubcommandBuilder().setName('owo').setDescription('Testing 123');

type BuilderPropsOnly<Type = SlashCommandBuilder> = Pick<
	Type,
	keyof {
		[Key in keyof Type as Type[Key] extends (...args: any) => any ? never : Key]: any;
	}
>;

expectTypeOf(getBuilder().addStringOption(getStringOption())).toMatchTypeOf<BuilderPropsOnly>();

expectTypeOf(getBuilder().addSubcommand(getSubcommand())).toMatchTypeOf<BuilderPropsOnly>();

```

# packages\builders\__tests__\util.test.ts

```ts
import { describe, test, expect } from 'vitest';
import { enableValidators, disableValidators, isValidationEnabled, normalizeArray } from '../src/index.js';

describe('validation', () => {
	test('enables validation', () => {
		enableValidators();
		expect(isValidationEnabled()).toBeTruthy();
	});

	test('disables validation', () => {
		disableValidators();
		expect(isValidationEnabled()).toBeFalsy();
	});
});

describe('normalizeArray', () => {
	test('normalizes an array or array (when input is an array)', () => {
		expect(normalizeArray([[1, 2, 3]])).toEqual([1, 2, 3]);
	});

	test('normalizes an array (when input is rest parameter)', () => {
		expect(normalizeArray([1, 2, 3])).toEqual([1, 2, 3]);
	});

	test('always returns a clone', () => {
		const arr = [1, 2, 3];
		expect(normalizeArray([arr])).toEqual(arr);
		expect(normalizeArray([arr])).not.toBe(arr);
	});
});

```

# packages\next\src\exports\builders.ts

```ts
export * from '@discordjs/builders';

```

