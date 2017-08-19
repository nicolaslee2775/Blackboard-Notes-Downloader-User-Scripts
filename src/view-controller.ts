import * as $ from 'jquery';


interface Initializable {
	init: () => void
}
export interface UiComponent extends Initializable {}

type UiComponentSet = {[key: string]: UiComponent };



export class ViewController {

	constructor() {}

	// ---------------------------------------------------------------

	initUi(ui: UiComponentSet) {
		this.loadCss();
		this.injectDomElement();

		this.initUiComponents(ui);
	}

	private loadCss() {
		this.addStyle({byUrl: "//cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/themes/base/jquery-ui.css"});
		this.addStyle({byUrl: "//cdnjs.cloudflare.com/ajax/libs/jstree/3.3.3/themes/default/style.min.css"});

		// Remove jsTreeTable selected color
		this.addStyle({byCss: `
			.jstree-default .jstree-wholerow-clicked,
			.jstree-table-midwrapper a.jstree-clicked:before,
			.jstree-table-midwrapper a.jstree-hovered:before,
			.jstree-default .jstree-wholerow-hovered {
				background: none;
			}
			.ui-button,.ui-widget {
				font-size: small;
			}
		`});

		// Status color
		this.addStyle({byCss: `
			.jstree-table-col-0[BND-status='idle'],
			.jstree-table-cell[BND-status='idle'] {
				background: none;
			}
			.jstree-table-col-0[BND-status='downloading'],
			.jstree-table-cell[BND-status='downloading'] {
				background: #f9efe2 !important;
			}
			.jstree-table-col-0[BND-status='done'],
			.jstree-table-cell[BND-status='done'] {
				background: #e4f7f1 !important;
			}
		`});
	}

	private injectDomElement() {
		// portlet
		$("#column0").prepend(`
			<div class="portlet clearfix">
				<h2 class="clearfix">
					<span class="moduleTitle">Notes Downloader</span>
				</h2>
				<div class="collapsible" style="overflow: auto;">
					<button id="BND-open-downloader">Open</button>
				</div>
			</div>
		`);

		// dialog
		$(document.body).prepend(`
			<div id="BND-filetree-dialog" title="Notes Downloader">

				<div style="margin-bottom: 5px; display: flex; align-items: center; padding: 3px;">
					<span>Zip File Name:&nbsp;</span>
					<input type="text" id="BND-zip-name" style="flex: 1;">
				</div>

				<div style="margin-bottom: 5px">
					<button id="BND-select-all">
						<span class="ui-icon ui-icon-check"></span> Select All
					</button>
					<button id="BND-deselect-all">
						<span class="ui-icon ui-icon-closethick"></span> Deselect All
					</button>
					<button id="BND-toggle-selection">Toggle</button>

					<button id="BND-start" class="ui-state-active">Start</button>
					<button id="BND-download" class="ui-state-active">Dwonload</button>
				</div>

				<div id="BND-jstree-div"></div>
			</div>
		`);
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