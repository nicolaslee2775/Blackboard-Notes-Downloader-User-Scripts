import * as $ from 'jquery';

import { Event } from '../../services/event';
import { UiComponent } from '../view-controller';


export interface DialogParam {
}

export class Dialog implements UiComponent {
	
	ele$: JQuery<HTMLElement>;

	onClose = new Event();

	constructor(private selector: string, private param?: DialogParam) {	
		this.param = this.param || {
		};
	}

	init() {
		this.ele$ = $(this.selector);
		this.ele$.dialog({
			autoOpen: false,
			modal: true,
			height: 600,
			width: '70%',
			//position: 'absolute',
			close: () => this.onClose.notify()
		});
		$(".ui-dialog").css("position", "absolute"); // Unknown issue: the position of ui-dialog would become 'relative'
	}

	open() {
		this.ele$.dialog("open");
	}
}