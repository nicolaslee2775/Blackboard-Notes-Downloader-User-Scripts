
import { Event } from './services/event';


import { TreeController } from './tree-controller';



export class ViewController {

	openDownloaderBtn: JQuery<HTMLButtonElement>;
	dialog: JQuery<HTMLElement>;
	zipNameTextbox: JQuery<HTMLInputElement>;
	
    selectAllBtn: JQuery<HTMLButtonElement>;
    deselectAllBtn: JQuery<HTMLButtonElement>;
    toggleSelectionBtn: JQuery<HTMLButtonElement>;
    startBtn: JQuery<HTMLButtonElement>;
	downloadBtn: JQuery<HTMLButtonElement>;
	
	//treeDiv: JQuery<HTMLElement>;
	//tree: JSTree;
	treeCtrl: TreeController;



	onOpenDownloader = new Event<void>();
	onSelectAll = new Event<void>();
	onDeselectAll = new Event<void>();
	onToggleSelection = new Event<void>();
	onStart = new Event<void>();
	onDownload = new Event<void>();
	

	// ---------------------------------------------------------------
	constructor() {}

	// ---------------------------------------------------------------

	initUi() {
		this.loadCss();
		this.injectDomElement();
		this.getDomElement();

		this.setup();
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

	private getDomElement() {
		this.openDownloaderBtn = <any> $("#BND-open-downloader");
		this.dialog = $("#BND-filetree-dialog");
		this.zipNameTextbox = <any> $("#BND-zip-name");

		this.selectAllBtn = <any> $("#BND-select-all");
		this.deselectAllBtn = <any> $("#BND-deselect-all");
		this.toggleSelectionBtn = <any> $("#BND-toggle-selection");
		this.startBtn = <any> $("#BND-start");
		this.downloadBtn = <any> $("#BND-download");

		//this.treeDiv = $('#BND-jstree-div');

		this.treeCtrl = new TreeController("#BND-jstree-div");
	}

	private setup() {

		// jsTree
		//this.treeCtrl.update(this.treeCtrl.getTestContentArray());
		
		
		// Dialog
		
		this.dialog.dialog({
			autoOpen: false,
			modal: true,
			height: 400,
			width: '70%',
			close: function() {
				//(Obj.tree).destroy();
				//Obj.tree = null;
			}
		});
		$(".ui-dialog").css("position", "absolute"); // Unknown issue: the position of ui-dialog would become 'relative'
		
		
		// Button
		
		
		this.openDownloaderBtn
			.button()
			.on("click", () => this.onOpenDownloader.notify());
		
		this.selectAllBtn
			.button()
			.on("click", () => this.onSelectAll.notify());
		
		this.deselectAllBtn
			.button()
			.on("click", () => this.onDeselectAll.notify());
		
		this.toggleSelectionBtn
			.button()
			.on("click", () => this.onToggleSelection.notify());

		this.startBtn
			.button()
			.on("click", () => this.onStart.notify());
		
		this.downloadBtn
			.button()
			.attr("disabled", "true")
			.addClass("ui-state-disabled")
			.on("click", () => this.onDownload.notify());
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