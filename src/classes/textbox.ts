import * as $ from 'jquery';

import { Event } from '../services/event';
import { UiComponent } from '../view-controller';

export interface TextboxParam {
}

export class Textbox implements UiComponent {
	
	ele$: JQuery<HTMLElement>;

	onClose = new Event();

	constructor(private selector: string, private param?: TextboxParam) {	
		this.param = this.param || {
		};
	}

	init() {
		this.ele$ = $(this.selector);
	}

	getText() {
		return this.ele$.val();
	}

	setText(text: string) {
		this.ele$.val(text);
	}
}