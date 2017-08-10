import * as $ from 'jquery'
import 'jquery-ui/ui/widgets/dialog'
import 'jstree'
import * as JSZip from 'jszip/dist/jszip.min'
import * as Bluebird from 'bluebird'
import * as fileSaver from 'file-saver'

declare var unsafeWindow;
//declare var JSZip;



type EventListener = (arg?: any) => void;
class Event<T> {
	//_sender: any;
	_listeners: EventListener[];

	constructor(/*sender: any*/) {  
		//this._sender = sender;
		this._listeners = [];
	}

	attach(listener: EventListener, thisArg?: any) {
		if(thisArg) listener = listener.bind(thisArg);
        this._listeners.push(listener);
	}
	
    notify(arg?: T) {
        for (var index = 0; index < this._listeners.length; index += 1) {
            this._listeners[index](arg);
        }
    }
}


namespace Http {

	export function downloadPage(url: string) {
        return new Bluebird<string>((resolve, reject) => {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (xhttp.readyState == 4 && xhttp.status == 200) {
                    resolve(xhttp.responseText);
                }
            };
            xhttp.open("GET", url, true);
            xhttp.send();
        });
	}

	export function downloadFile(url: string) {
        return new Bluebird<{ response: string, responseURL: string }>(function(resolve, reject) {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (xhttp.readyState == 4 && xhttp.status == 200) {
                    resolve({
                        response: xhttp.response,
                        responseURL: xhttp.responseURL
                    });
                }
            };
            xhttp.responseType = "blob";
            xhttp.open("GET", url, true);
            xhttp.send();
        });
    }
}




/*interface DomElementController {

	domEle: JQuery<HTMLElement>;

	getDomString: () => string;
	getDomElement: () => JQuery<HTMLElement>;
}


export class TreeController implements DomElementController {

	domEle: JQuery<HTMLElement>;

	constructor() {}

	getDomString = () => `
		<div id="BND-jstree-div"></div>
	`;

	getDomElement = () => $("#BND-jstree-div");
}*/




interface FileContent {
	id: number
	type: string
	name: string
	url?: string
	attachmentName?: string
	parent?: number
}

export class TreeController {

	ele: JQuery<HTMLElement>;
	tree: JSTree;
	data: any[] = [];
	contentArray: FileContent[] = [];

	constructor(selector: string) {
		this.ele = $(selector);
		this.ele.jstree({ 
			core: { 
				data: (obj, callback) => callback.call(this, this.data),
                check_callback: (operation, node, node_parent, node_position, more) => true
			},
			types: {
				File: 	{ icon: "jstree-default jstree-file" },
				Doc: 	{ icon: "jstree-default jstree-file" },
				Folder: { icon: "jstree-default jstree-folder" }
			},
			table: {
				resizable: true,
				width: "100%",
				columns: [
					{width: 300, header: "Nodes"},
					{width: 200, header: "Attachment Name", value: "attachmentName"},
					{width: 200, header: "File Name", value: "fileName"},
					{width: 100, header: "Status", value: "status"}
				]
			},
			plugins: ["checkbox", "types", "wholerow", "table"]
		});
		this.tree = this.ele.jstree();
		console.log(this.tree);
	}

	openAll() {
		if(this.tree) this.tree.open_all();
	}

	selectAll() {
		if(this.tree) this.tree.select_all();		
	}
	deselectAll() {
		if(this.tree) this.tree.deselect_all();		
	}
	toggleSelection() {
		if(this.tree) {
			this.forEach(item => {
				if(item.type === "Folder") return;
				if(this.tree.is_selected(item)) {
					this.tree.uncheck_node(item, null);
				} else {
					this.tree.check_node(item, null);
				}
			});
		}
	}


	update(contentArray: FileContent[]) {
		this.contentArray = contentArray;
		this.data = this.conevrtToJsTreeData(contentArray);
		(<any>this.tree).refresh();
		(<any>this.tree).element.trigger("resize_column.jstree-table"); // Force jsTreeTable calculate the height of the cell (jsTreeTable.js:340)
		//console.log("jsTree Data:", Data.jsTreeData);
	}

	getTestContentArray(): FileContent[] {
		return [
			{
				"id": 0,
				"type": "Folder",
				"name": "Content",
				"url": "https://learn.polyu.edu.hk/webapps/blackboard/content/listContent.jsp?course_id=_53054_1&content_id=_2242014_1&mode=reset"
			},
			{
				"id": 1,
				"type": "Folder",
				"name": "Library Resources",
				"url": "https://learn.polyu.edu.hk/webapps/blackboard/content/listContent.jsp?course_id=_53054_1&content_id=_2242037_1&mode=reset"
			},
			{
				"id": 2,
				"parent": 1,
				"type": "Doc",
				"name": "Library Tips & Tricks!",
				"attachmentName": ""
			},
			{
				"id": 3,
				"parent": 0,
				"type": "Folder",
				"name": "Course notes",
				"url": "/webapps/blackboard/content/listContent.jsp?course_id=_53054_1&content_id=_2356432_1"
			},
			{
				"id": 4,
				"parent": 0,
				"type": "Folder",
				"name": "Quiz and Tutorial",
				"url": "/webapps/blackboard/content/listContent.jsp?course_id=_53054_1&content_id=_2356448_1"
			},
			{
				"id": 5,
				"parent": 0,
				"type": "Folder",
				"name": "Laboratory Exercise",
				"url": "/webapps/blackboard/content/listContent.jsp?course_id=_53054_1&content_id=_2392360_1"
			},
			{
				"id": 6,
				"parent": 0,
				"type": "Doc",
				"name": "Assessment Plan",
				"attachmentName": " EIE4413 Assessment Plan.pdf",
				"url": "/bbcswebdav/pid-2356444-dt-content-rid-9763100_1/xid-9763100_1"
			},
			{
				"id": 7,
				"parent": 0,
				"type": "Doc",
				"name": "Course Schedule",
				"attachmentName": " Time Schedule.pdf",
				"url": "/bbcswebdav/pid-2356446-dt-content-rid-9763701_1/xid-9763701_1"
			},
			{
				"id": 8,
				"parent": 0,
				"type": "Doc",
				"name": "Assignment 1 Solution",
				"attachmentName": " Assignment1_sol.pdf",
				"url": "/bbcswebdav/pid-2399419-dt-content-rid-9879580_1/xid-9879580_1"
			},
			{
				"id": 9,
				"parent": 0,
				"type": "Doc",
				"name": "Test 1 Solution",
				"attachmentName": " Test1_sol.pdf",
				"url": "/bbcswebdav/pid-2408006-dt-content-rid-9947505_1/xid-9947505_1"
			},
			{
				"id": 10,
				"parent": 0,
				"type": "Doc",
				"name": "Assignment 2 Solution",
				"attachmentName": " Assignment2_sol.pdf",
				"url": "/bbcswebdav/pid-2420095-dt-content-rid-10076281_1/xid-10076281_1"
			},
			{
				"id": 11,
				"parent": 0,
				"type": "Doc",
				"name": "Test 2 Solution",
				"attachmentName": " Test2_sol.pdf",
				"url": "/bbcswebdav/pid-2421084-dt-content-rid-10101060_1/xid-10101060_1"
			},
			{
				"id": 12,
				"parent": 5,
				"type": "Doc",
				"name": "Introduction to Matlab",
				"attachmentName": " matlabTut.docx matlabTut_sol.docx",
				"url": "/bbcswebdav/pid-2392363-dt-content-rid-9835952_1/xid-9835952_1"
			},
			{
				"id": 13,
				"parent": 3,
				"type": "Doc",
				"name": "Introduction",
				"attachmentName": " Introduction.pptx",
				"url": "/bbcswebdav/pid-2356433-dt-content-rid-9763096_1/xid-9763096_1"
			},
			{
				"id": 14,
				"parent": 3,
				"type": "Doc",
				"name": "Fourier analysis",
				"attachmentName": " Fourier (for distribution).pptx",
				"url": "/bbcswebdav/pid-2356435-dt-content-rid-9763098_1/xid-9763098_1"
			},
			{
				"id": 15,
				"parent": 3,
				"type": "Doc",
				"name": "Convolution",
				"attachmentName": " Convolution (for distribution).pptx",
				"url": "/bbcswebdav/pid-2387896-dt-content-rid-9815376_1/xid-9815376_1"
			},
			{
				"id": 16,
				"parent": 3,
				"type": "Doc",
				"name": "Z-transform",
				"attachmentName": " Ztransform (for distribution).pptx",
				"url": "/bbcswebdav/pid-2392211-dt-content-rid-9835185_1/xid-9835185_1"
			},
			{
				"id": 17,
				"parent": 3,
				"type": "Doc",
				"name": "FIR Filter",
				"attachmentName": " FIR (for distribution).pptx",
				"url": "/bbcswebdav/pid-2396286-dt-content-rid-9862738_1/xid-9862738_1"
			},
			{
				"id": 18,
				"parent": 3,
				"type": "Doc",
				"name": "IIR Filter",
				"attachmentName": " IIR (for distribution).pptx",
				"url": "/bbcswebdav/pid-2408055-dt-content-rid-9947332_1/xid-9947332_1"
			},
			{
				"id": 19,
				"parent": 3,
				"type": "Doc",
				"name": "Statistical Signal Processing",
				"attachmentName": " Statistical DSP (for distribution).pptx",
				"url": "/bbcswebdav/pid-2413399-dt-content-rid-9993156_1/xid-9993156_1"
			},
			{
				"id": 20,
				"parent": 3,
				"type": "Doc",
				"name": "Adaptive Filter",
				"attachmentName": " Adaptive filter 3 (for distribution).pptx",
				"url": "/bbcswebdav/pid-2416941-dt-content-rid-10030996_1/xid-10030996_1"
			},
			{
				"id": 21,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 1 Solution",
				"attachmentName": " Quiz1_sol.pdf",
				"url": "/bbcswebdav/pid-2372832-dt-content-rid-9786988_1/xid-9786988_1"
			},
			{
				"id": 22,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 2 Solution",
				"attachmentName": " Quiz2_sol.pdf",
				"url": "/bbcswebdav/pid-2383706-dt-content-rid-9799636_1/xid-9799636_1"
			},
			{
				"id": 23,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 3 Solution",
				"attachmentName": " Quiz3_sol.pdf",
				"url": "/bbcswebdav/pid-2391825-dt-content-rid-9833400_1/xid-9833400_1"
			},
			{
				"id": 24,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 4 Solution",
				"attachmentName": " Quiz4_sol.pdf",
				"url": "/bbcswebdav/pid-2391826-dt-content-rid-9833801_1/xid-9833801_1"
			},
			{
				"id": 25,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 5 Solution",
				"attachmentName": " Quiz5_sol.pdf",
				"url": "/bbcswebdav/pid-2397895-dt-content-rid-9873055_1/xid-9873055_1"
			},
			{
				"id": 26,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 6 Solution",
				"attachmentName": " Quiz6_sol.pdf",
				"url": "/bbcswebdav/pid-2397896-dt-content-rid-9873056_1/xid-9873056_1"
			},
			{
				"id": 27,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 7 Solution",
				"attachmentName": " Quiz7_sol.pdf",
				"url": "/bbcswebdav/pid-2397898-dt-content-rid-9873057_1/xid-9873057_1"
			},
			{
				"id": 28,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 8 Solution",
				"attachmentName": " Quiz8_sol.pdf",
				"url": "/bbcswebdav/pid-2405483-dt-content-rid-9924842_1/xid-9924842_1"
			},
			{
				"id": 29,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 9 Solution",
				"attachmentName": " Quiz9_sol.pdf",
				"url": "/bbcswebdav/pid-2408198-dt-content-rid-9947863_1/xid-9947863_1"
			},
			{
				"id": 30,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 10 Solution",
				"attachmentName": " Quiz10_sol.pdf",
				"url": "/bbcswebdav/pid-2413375-dt-content-rid-9993151_1/xid-9993151_1"
			},
			{
				"id": 31,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 11 Solution",
				"attachmentName": " Quiz11_sol.pdf",
				"url": "/bbcswebdav/pid-2413377-dt-content-rid-9993152_1/xid-9993152_1"
			},
			{
				"id": 32,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 12 Solution",
				"attachmentName": " Quiz12_sol.pdf",
				"url": "/bbcswebdav/pid-2416939-dt-content-rid-10030994_1/xid-10030994_1"
			},
			{
				"id": 33,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 13 Solution",
				"attachmentName": " Quiz13_sol.pdf",
				"url": "/bbcswebdav/pid-2416940-dt-content-rid-10030995_1/xid-10030995_1"
			},
			{
				"id": 34,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 14 Solution",
				"attachmentName": " Quiz14_sol.pdf",
				"url": "/bbcswebdav/pid-2417955-dt-content-rid-10044075_1/xid-10044075_1"
			}
			];
	}



	forEach(callback: (item: any) => void) {
		if(this.tree) {
			this.tree
				.get_json(null, <any> {flat: true})
				.forEach(callback);
		}
	}

	find(condition: (item: any) => boolean): any {
		if(this.tree) {
			var array = this.tree.get_json(null, <any> {flat: true});
			for(var i = 0; i < array.length; i++) {
				var item = array[i];
				if(condition(item) !== true) return item;
			}
			return null;
		} else {
			return null;
		}
	}

	edit(id: number, callback: (node: any) => any) {
		if(this.tree) {
			var node = this.tree.get_node(id);
			var newNode = callback(node);
			if(!newNode) newNode = node;
			this.tree.redraw_node(newNode, null, null, null);
		}
	}

	editData(id: number, dataFiled: string, value: string) {
		if(this.tree) {		
			var node = this.tree.get_node(id);
			node.data[dataFiled] = value;
			this.tree.redraw_node(node, null, null, null);
		}
	}
	getRowDOM(id: number): JQuery<HTMLElement> {
		var cell0 = $("#"+id+"_anchor");
		var otherCell = $(".jstable_"+id+"_col");
		return cell0.add(otherCell);
	}

	private conevrtToJsTreeData(contentArray: FileContent[]) {
		var data = [];
		for(var i = 0; i < contentArray.length; i++) {
			var item = contentArray[i];
			var parent = (item.parent === undefined) ? "#" : item.parent;
			data.push({
				id: item.id,
				parent: parent,
				text: item.name,
				data: { attachmentName: item.attachmentName },
				type: item.type,

				state: { opened: true, selected: false }
			});
		}
		return data;
	}



	getFolderPath(id: number, contentArray: FileContent[]): string {
		if(id === undefined) {
			return "";
		} else {
			var fileItem = contentArray[id];
			var parentFolderPath = this.getFolderPath(fileItem.parent, contentArray);
			return parentFolderPath + fileItem.name + "/";
		}
	}

	removeDuplicate(downloadList: DownloadListItem[], fileDict: {[id:number]: DownloadFileItem}) {
		return new Bluebird<DownloadListItem[]>((resolve, reject) => {
            var filtered = downloadList.filter(item => !fileDict[item.id]);
			//console.log("filtered:", filtered);
            resolve(filtered);
		});
	}
}


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




interface DownloadListItem {
	id: number
	name: string
	path: string
	url: string
}
interface DownloadFileItem {
	id: number
	name: string
	path: string
	data: string
	url: string
}
class WebScraping {

	getFileArray(html: string, parentId: number, counter: { get: () => number }) {
        var isDefined = (obj) => obj !== undefined;
        
        var //counter = { id: 0, get:() => counter.id++ },
            //parentId = (this !== window && isDefined(this.parentId)) ? (this.parentId) : undefined,
            contentArray: FileContent[] = [];
        
            //var testArray = [];

		
		return new Bluebird<FileContent[]>((resolve, reject) => {
			var deferredTask: Bluebird<FileContent[]>[] = []; // for each folder

			var contentListItem = $(html).find("li[id^='contentListItem']");

			contentListItem.each((_, item) => {
				//var item = this;
				var iconSrc = (<HTMLImageElement> $(item).find(".item_icon")[0]).src;

				var isFile 		= this._endsWith(iconSrc, "file_on.gif"),
					isDocument  = this._endsWith(iconSrc, "document_on.gif"),
					isFolder 	= this._endsWith(iconSrc, "folder_on.gif");
				//console.log(isFile, iconSrc);

				//console.log(isFile, isDocument, isFolder);
				if(isFile) {
					var fileName = $(item).find("div.item a>span").text(),
						fileUrl = $(item).find("div.item a").attr("href");
					contentArray.push({
						id: counter.get(),
						parent: isDefined(parentId) ? parentId : undefined,
						type: "File",
						name: fileName,
						url: fileUrl
					});

				} else if(isDocument) {
					var docName = $(item).find("div.item span+span").text(),
						docFileName = $(item).find("div.details .attachments a").text(),
						docUrl = $(item).find("div.details .attachments a").attr("href");
					contentArray.push({
						id: counter.get(),
						parent: isDefined(parentId) ? parentId : undefined,
						type: "Doc",
						name: docName,
						attachmentName: docFileName,
						url: docUrl
					});

				} else if(isFolder) {
					var folderName = $(item).find("div.item a>span").text(),
						folderUrl = $(item).find("div.item a").attr("href");

					var temp = {
						id: counter.get(),
						parent: isDefined(parentId) ? parentId : undefined,
						type: "Folder",
						name: folderName,
						url: folderUrl
					};
					contentArray.push(temp);

					//console.log({folder: folderName, url: folderUrl});

					deferredTask.push(
						Http.downloadPage(folderUrl)
							.tap(html => console.log("download! id:", temp.id))
							.then(html => this.getFileArray(html, temp.id, counter))
					);
				}

				console.log(parentId, contentArray[contentArray.length-1].id);

				//testArray.push(contentArray[contentArray.length-1]);
			});

			console.log(`[${parentId}] deferredTask:`, deferredTask);
			//console.log("parentId:", parentId, testArray);
			
			if(deferredTask.length === 0) {
				resolve(contentArray);
			} else {
				Bluebird
					.all(deferredTask)
					//.tap(deferredTaskData => console.log(`[${parentId}] deferredTaskData:`, deferredTaskData))
					.reduce<FileContent[], FileContent[]>((prev, next) => prev.concat(next), [])
					.then(childContentArray => {
						resolve(childContentArray.concat(contentArray))
					});
			}

		});
		
		
	}
	
	private _endsWith(str: string, pattern: string) {
		var d = str.length - pattern.length;
		return d >= 0 && str.indexOf(pattern, d) === d;
	}

	prepareDownloadList(contentArray: FileContent[], treeCtrl: TreeController) {
		return new Bluebird<DownloadListItem[]>((resolve, reject) => {
			var downloadList: DownloadListItem[] = [];

			treeCtrl.forEach(viewItem => {
				if(viewItem.type === "Folder") return;

				var selected = treeCtrl.tree.is_selected(viewItem),
					undetermined = treeCtrl.tree.is_undetermined(viewItem);

				if(selected || undetermined) {
					var fileItem = contentArray[viewItem.id];

					downloadList.push({
						id: viewItem.id,
						name: viewItem.text, 
						path: treeCtrl.getFolderPath(fileItem.parent, contentArray), 
						url: fileItem.url
					});
				}

			});  

			resolve(downloadList);
		});
	}
}



interface Model {
	contentArray: FileContent[]
	fileDict: {[id: number]: DownloadFileItem};
}


export class MainController {

	model: Model = {
		contentArray: [],
		fileDict: {}
	}

	state = {
		contentArrayFeteched: false
	};

	viewCtrl = new ViewController();
	treeCtrl: TreeController;
	

	constructor() {
		this.viewCtrl.onOpenDownloader.attach(() => this.openDownloader());

		this.viewCtrl.onSelectAll.attach(() => this.viewCtrl.treeCtrl.selectAll());
		this.viewCtrl.onDeselectAll.attach(() => this.viewCtrl.treeCtrl.deselectAll());
		this.viewCtrl.onToggleSelection.attach(() => this.viewCtrl.treeCtrl.toggleSelection());
		this.viewCtrl.onStart.attach(() => this.start());
		this.viewCtrl.onDownload.attach(() => this.download());
	}

	init() {
		// Load CSS
		this.viewCtrl.initUi();

		this.treeCtrl.tree.resize();
	}

	openDownloader() {
		this.viewCtrl.dialog.dialog("open");

		if(!this.state.contentArrayFeteched) {
			this.state.contentArrayFeteched = true;
			this.fetchContentArray();
		}
	}

	private fetchContentArray() {
		var defaultZipName = $("#courseMenuPalette_paletteTitleHeading a.comboLink").text();
		this.viewCtrl.zipNameTextbox.val(defaultZipName);

		
		var contentUrlArray: { url: string, name: string }[] = <any> $("#courseMenuPalette_contents>li>a[href^='/webapps/blackboard/content/listContent.jsp']").map((i, item) => ({ 
			url: (<any> item).href, 
			name: $(item).find("span").attr("title") 
		}));
		
		console.log({ contentUrlArray: contentUrlArray });
		
		var counter = {
			id: 0,
			get: () => counter.id++,
			set: (val) => counter.id = val
		};
		
		
		//counter.set(contentUrlArray.length);


		var webScraping = new WebScraping();
		
		Bluebird.map(contentUrlArray, contentUrl => {

				let parentContent = {
					id: counter.get(),
					parent: undefined,
					type: "Folder",
					name: contentUrl.name,
					url: contentUrl.url
				};
			
				return Http.downloadPage(contentUrl.url)
					.then(html => webScraping.getFileArray(html, parentContent.id, counter))
					//.tap(subContentArray => console.log("subContentArray:", subContentArray))
					.then(subContentArray => subContentArray.concat([parentContent]))
			})
			.reduce<FileContent[], FileContent[]>((prev, next) => prev.concat(next)) // 2D -> 1D
			.then(contentArray => contentArray.sort((a, b) => a.id - b.id))
			.then(contentArray => {
				console.log("contentArray:", contentArray);
				unsafeWindow.contentArray = contentArray;
				this.viewCtrl.treeCtrl.update(contentArray);
				this.viewCtrl.treeCtrl.openAll();
			});
		


		//this.viewCtrl.treeCtrl.update(this.viewCtrl.treeCtrl.getTestContentArray());
		//this.viewCtrl.treeCtrl.openAll();
	}

	start() {
		if(this.viewCtrl.treeCtrl.contentArray.length === 0) return;

		let webScraping = new WebScraping();
		//let fileDict: { [id: number]: DownloadFileItem } = {};

		webScraping.prepareDownloadList(this.viewCtrl.treeCtrl.contentArray, this.viewCtrl.treeCtrl)
			.then(downloadList => this.viewCtrl.treeCtrl.removeDuplicate(downloadList, this.model.fileDict))
			.tap(downloadList => 
				downloadList.forEach(item => {
					this.viewCtrl.treeCtrl.editData(item.id, "status", "Downloading...");
					this.viewCtrl.treeCtrl.getRowDOM(item.id).attr("BND-status", "downloading");
				})
			)
            .map<DownloadListItem, DownloadFileItem>(item => 
				Http.downloadFile(item.url).then(result => ({
					id: item.id,
					name: item.name,
					path: item.path,
					data: result.response,
					url: result.responseURL
				}))
                .tap(file => {
					console.log("Downloaded!", {id: file.id, name: file.name, url: file.url});

					var index = file.url.lastIndexOf("/") + 1;
					var fileName = decodeURIComponent(file.url.substring(index));
					this.viewCtrl.treeCtrl.editData(file.id, "fileName", fileName);

					this.viewCtrl.treeCtrl.editData(file.id, "status", "Done!");
					this.viewCtrl.treeCtrl.getRowDOM(file.id).attr("BND-status", "done");
				})
			)
			.then(fileArray => {
				fileArray.forEach(file => this.model.fileDict[file.id] = file);

				this.viewCtrl.downloadBtn
					.attr("disabled", <any> false)
					.removeClass("ui-state-disabled")
			});
	}

	download() {
		console.log("download");
		var zip = new JSZip();

		unsafeWindow.JSZip = JSZip;

		for(var id in this.model.fileDict) {
			let item = this.model.fileDict[id];
			console.log("item:", item);

			var fileExtension = item.url.substring(item.url.lastIndexOf("."));
			zip.file(item.path + item.name + fileExtension, item.data);
		}

		console.log("files:", zip.files);
		return zip.generateAsync({type:"blob"})
			.then(blob => {
				console.log("archived!");
				var zipName = this.viewCtrl.zipNameTextbox.val();
				fileSaver.saveAs(blob, zipName + ".zip");
			});
	}

	/*
	private getFileArray(html: string, parentId: number = undefined) {
        var isDefined = (obj) => obj !== undefined;
        
        var counter = { id: 0, get:() => counter.id++ },
            //parentId = (this !== window && isDefined(this.parentId)) ? (this.parentId) : undefined,
            contentArray: FileContent[] = [];
        

        return _getFileArray(html, parentId);

        //----------------------------------------------

        function _getFileArray(html, parentId) {
            //var testArray = [];

            return new Bluebird<FileContent[]>(function(resolve, reject) {
                 var deferredTask = []; // for each folder

                 var contentListItem = $(html).find("li[id^='contentListItem']");

                 contentListItem.each(function(){
                    var item = this;
                    var iconSrc = (<HTMLImageElement> $(item).find(".item_icon")[0]).src;

                    var isFile = _endsWith(iconSrc, "file_on.gif"),
                        isDocument = _endsWith(iconSrc, "document_on.gif"),
                        isFolder = _endsWith(iconSrc, "folder_on.gif");
                    //console.log(isFile, iconSrc);

                    //console.log(isFile, isDocument, isFolder);
                    if(isFile) {
                       var fileName = $(item).find("div.item a>span").text(),
                           fileUrl = $(item).find("div.item a").attr("href");
                       contentArray.push({
                          id: counter.get(),
                          parent: isDefined(parentId) ? parentId : undefined,
                          type: "File",
                          name: fileName,
                          url: fileUrl
                       });

                    } else if(isDocument) {
                       var docName = $(item).find("div.item span+span").text(),
                           docFileName = $(item).find("div.details .attachments a").text(),
                           docUrl = $(item).find("div.details .attachments a").attr("href");
                       contentArray.push({
                          id: counter.get(),
                          parent: isDefined(parentId) ? parentId : undefined,
                          type: "Doc",
                          name: docName,
                          attachmentName: docFileName,
                          url: docUrl
                       });

                    } else if(isFolder) {
                       var folderName = $(item).find("div.item a>span").text(),
                           folderUrl = $(item).find("div.item a").attr("href");

                       var temp = {
                          id: counter.get(),
                          parent: isDefined(parentId) ? parentId : undefined,
                          type: "Folder",
                          name: folderName,
                          url: folderUrl
                       };
                       contentArray.push(temp);

                       //console.log({folder: folderName, url: folderUrl});

                       deferredTask.push(
                          Http.downloadPage(folderUrl).then(function(html) {
                             return _getFileArray(html, temp.id);
                          })
                       );
                    }

                    //testArray.push(contentArray[contentArray.length-1]);
                 });

                 //console.log("parentId:", parentId, testArray);

                 Bluebird.all(deferredTask)
                    .then(function() {
                        resolve(contentArray);
                     });

          });
		}
		
		function _endsWith(str: string, pattern: string) {
			var d = str.length - pattern.length;
			return d >= 0 && str.indexOf(pattern, d) === d;
		}
	}
	
	private _getFileArray(html: string, parentId: number = undefined) {
        var isDefined = (obj) => obj !== undefined;
        
        var counter = { id: 0, get:() => counter.id++ },
            //parentId = (this !== window && isDefined(this.parentId)) ? (this.parentId) : undefined,
            contentArray: FileContent[] = [];
        
            //var testArray = [];

		function _endsWith(str: string, pattern: string) {
			var d = str.length - pattern.length;
			return d >= 0 && str.indexOf(pattern, d) === d;
		}
		
		return new Bluebird<FileContent[]>(function(resolve, reject) {
			var deferredTask = []; // for each folder

			var contentListItem = $(html).find("li[id^='contentListItem']");

			contentListItem.each(function(){
			var item = this;
			var iconSrc = (<HTMLImageElement> $(item).find(".item_icon")[0]).src;

			var isFile 		= _endsWith(iconSrc, "file_on.gif"),
				isDocument  = _endsWith(iconSrc, "document_on.gif"),
				isFolder 	= _endsWith(iconSrc, "folder_on.gif");
			//console.log(isFile, iconSrc);

			//console.log(isFile, isDocument, isFolder);
			if(isFile) {
				var fileName = $(item).find("div.item a>span").text(),
					fileUrl = $(item).find("div.item a").attr("href");
				contentArray.push({
					id: counter.get(),
					parent: isDefined(parentId) ? parentId : undefined,
					type: "File",
					name: fileName,
					url: fileUrl
				});

			} else if(isDocument) {
				var docName = $(item).find("div.item span+span").text(),
					docFileName = $(item).find("div.details .attachments a").text(),
					docUrl = $(item).find("div.details .attachments a").attr("href");
				contentArray.push({
					id: counter.get(),
					parent: isDefined(parentId) ? parentId : undefined,
					type: "Doc",
					name: docName,
					attachmentName: docFileName,
					url: docUrl
				});

			} else if(isFolder) {
				var folderName = $(item).find("div.item a>span").text(),
					folderUrl = $(item).find("div.item a").attr("href");

				var temp = {
					id: counter.get(),
					parent: isDefined(parentId) ? parentId : undefined,
					type: "Folder",
					name: folderName,
					url: folderUrl
				};
				contentArray.push(temp);

				//console.log({folder: folderName, url: folderUrl});

				deferredTask.push(
					Http.downloadPage(folderUrl).then(function(html) {
						return _getFileArray(html, temp.id);
					})
				);
			}

			//testArray.push(contentArray[contentArray.length-1]);
			});

			//console.log("parentId:", parentId, testArray);

			Bluebird.all(deferredTask)
			.then(function() {
				resolve(contentArray);
				});

		});
		
		
	}
	*/
}