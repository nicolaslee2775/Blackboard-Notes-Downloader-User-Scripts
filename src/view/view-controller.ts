import * as $ from 'jquery';

// import template
import style from './templates/style.css';
import portletTemplate from './templates/portlet.html';
import dialogTemplate from './templates/dialog.html';



interface Initializable {
	init: () => void
}
export interface UiComponent extends Initializable {}

type UiComponentSet = Dict<UiComponent>;



export class ViewController {

	constructor() {}

	// ---------------------------------------------------------------

	initUi(ui: UiComponentSet) {
		this.loadCss();
		this.loadTemplates();

		this.initUiComponents(ui);
	}

	private loadCss() {
		this.addStyle({byUrl: "//cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/themes/base/jquery-ui.css"});
		this.addStyle({byUrl: "//cdnjs.cloudflare.com/ajax/libs/jstree/3.3.3/themes/default/style.min.css"});

		this.addStyle({byCss: style});
	}

	private loadTemplates() {
		// portlet
		$("#column0").prepend(portletTemplate);

		// dialogTemplate
		$(document.body).prepend(dialogTemplate);
	}

	private initUiComponents(ui: UiComponentSet) {
		for(var key in ui) {
			let component = ui[key];
			component.init();
		}
	}

	// ---------------------------------------------------------------

	private addStyle(params: { byUrl?: string, byCss?: string }) {
		let byUrl = params.byUrl,
			byCss = params.byCss;
		
		var css;
		if(byUrl !== undefined) {
			css = document.createElement("link");
			css.rel = "stylesheet";
			css.type = "text/css";
			css.href = byUrl;
		} else if(byCss !== undefined) {
			css = document.createElement("style");
			css.type = "text/css";
			css.innerHTML = byCss;
		}
		document.body.appendChild(css);
	}
}