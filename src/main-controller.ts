import * as $ from 'jquery';
import 'jquery-ui/ui/widgets/dialog';
import 'jquery-ui/ui/widgets/tabs';
import 'jstree';
import './lib/jstree-table';
import * as JSZip from 'jszip/dist/jszip.min';
import * as Bluebird from 'bluebird';
import * as fileSaver from 'file-saver';


import { Event } from './services/event';
import { Http } from './services/http';
import { WebScraping, FileContent, DownloadFileItem, DownloadListItem } from './services/web-scraping';

import { ViewController } from './view/view-controller';
import { Tabs } from './view/ui-component/tabs';
import { Tree } from './view/ui-component/tree';
import { Button } from './view/ui-component/button';
import { Dialog } from './view/ui-component/dialog';
import { Textbox } from './view/ui-component/textbox';


declare var unsafeWindow;
var TEST_MODE = unsafeWindow.TEST_MODE || false;


/*

Fetch contentList
	contentUrlList: { url, name }[]
	contentList: FileContent[]

Download Files
	downloadList: DownloadListItem[]
	fileList: DownloadFileItem[]

Archive and downlaod zip file
	
*/


interface Model {
	contentList: FileContent[]
	fileDict    : Dict<DownloadFileItem>;
}


export class MainController {

	model: Model = {
		contentList: [],
		fileDict    : {}
	}

	state = {
		contentListFeteched: false
	};

	ui = {
		tabs: new Tabs("#BND-tabs"),

		dialog: new Dialog("#BND-filetree-dialog"),

		zipNameTextbox: new Textbox("#BND-zip-name"),

		openDownloaderBtn : new Button("#BND-open-downloader"),
		selectAllBtn      : new Button("#BND-select-all"),
		deselectAllBtn    : new Button("#BND-deselect-all"),
		toggleSelectionBtn: new Button("#BND-toggle-selection"),
		downloadBtn       : new Button("#BND-download"),
		archiveBtn        : new Button("#BND-archive", { disabled: true }),

		tree: new Tree("#BND-jstree-div")
	};
	

	viewCtrl = new ViewController();
	webScraping = new WebScraping();
	document: Document;

	constructor() {}

	init() {
		this.bindEvents();
		
		this.document = document;

		this.viewCtrl.initUi(this.ui);

		if(TEST_MODE) {
			unsafeWindow.$ = $;
			setTimeout(() => this.openDownloader(), 100);		
		}
	}

	openDownloader() {
		this.ui.dialog.open();

		if(!this.state.contentListFeteched) {
			this.state.contentListFeteched = true;

			if(TEST_MODE) {
				this.fetchFakeContentList();

			} else {
				let defaultZipName = this.webScraping.getCourseName(this.document);
				this.ui.zipNameTextbox.setText(defaultZipName);
				
				this.webScraping.getContentList(this.document, {
					onUpdate: (contentList) => {
						this.ui.tree.update(contentList);
					},
					onCompleted: (contentList) => {
						unsafeWindow.contentList = contentList;

						this.ui.tree.update(contentList);
						//this.ui.tree.openAll();
					}
				});		
			}
		}
	}

	downloadFiles() {
		let contentList = this.ui.tree.getContentList();
		if(contentList.length === 0) return;

		this.webScraping.downloadFiles(contentList, this.ui.tree, this.model.fileDict, {
			onStartDownload: (downloadList => {
				downloadList.forEach(item => {
					this.ui.tree.editData(item.id, "status", "Downloading...");
					this.ui.tree.getRowDOM(item.id).attr("BND-status", "downloading");
				});
			}),
			onFileDownloaded: (file => {
				console.log("Downloaded!", {id: file.id, name: file.name, url: file.url});
				
				var index = file.url.lastIndexOf("/") + 1;
				var fileName = decodeURIComponent(file.url.substring(index));
				this.ui.tree.editData(file.id, "fileName", fileName);

				this.ui.tree.editData(file.id, "status", "Done!");
				this.ui.tree.getRowDOM(file.id).attr("BND-status", "done");
			}),
			onAllDownloaded: (files => {
				files.forEach(file => this.model.fileDict[file.id] = file);

				this.ui.archiveBtn.enable();
			}),
		});
	}

	archive() {
		//console.log("download");
		var zip = new JSZip();

		for(var id in this.model.fileDict) {
			let item = this.model.fileDict[id];
			//console.log("item:", item);

			var fileExtension = item.url.substring(item.url.lastIndexOf("."));
			zip.file(item.path + item.name + fileExtension, item.data);
		}

		//console.log("files:", zip.files);
		return zip.generateAsync({type:"blob"})
			.then(blob => {
				//console.log("archived!");
				var zipName = this.ui.zipNameTextbox.getText();
				fileSaver.saveAs(blob, zipName + ".zip");
			});
	}

	private bindEvents() {
		this.ui.openDownloaderBtn.onClick.attach(() => this.openDownloader());
		this.ui.selectAllBtn.onClick.attach(() => this.ui.tree.selectAll());
		this.ui.deselectAllBtn.onClick.attach(() => this.ui.tree.deselectAll());
		this.ui.toggleSelectionBtn.onClick.attach(() => this.ui.tree.toggleSelection());
		this.ui.downloadBtn.onClick.attach(() => this.downloadFiles());
		this.ui.archiveBtn.onClick.attach(() => this.archive());
	}

	private fetchFakeContentList() {
		this.ui.zipNameTextbox.setText("test");

		let contentList: FileContent[] = [{"id":0,"type":"Folder","name":"Content","url":"https://learn.polyu.edu.hk/webapps/blackboard/content/listContent.jsp?course_id=_53054_1&content_id=_2242014_1&mode=reset"},{"id":1,"type":"Folder","name":"Library Resources","url":"https://learn.polyu.edu.hk/webapps/blackboard/content/listContent.jsp?course_id=_53054_1&content_id=_2242037_1&mode=reset"},{"id":2,"parent":1,"type":"Doc","name":"Library Tips & Tricks!","attachmentName":""},{"id":3,"parent":0,"type":"Folder","name":"Course notes","url":"/webapps/blackboard/content/listContent.jsp?course_id=_53054_1&content_id=_2356432_1"},{"id":4,"parent":0,"type":"Folder","name":"Quiz and Tutorial","url":"/webapps/blackboard/content/listContent.jsp?course_id=_53054_1&content_id=_2356448_1"},{"id":5,"parent":0,"type":"Folder","name":"Laboratory Exercise","url":"/webapps/blackboard/content/listContent.jsp?course_id=_53054_1&content_id=_2392360_1"},{"id":6,"parent":0,"type":"Doc","name":"Assessment Plan","attachmentName":" EIE4413 Assessment Plan.pdf","url":"/bbcswebdav/pid-2356444-dt-content-rid-9763100_1/xid-9763100_1"},{"id":7,"parent":0,"type":"Doc","name":"Course Schedule","attachmentName":" Time Schedule.pdf","url":"/bbcswebdav/pid-2356446-dt-content-rid-9763701_1/xid-9763701_1"},{"id":8,"parent":0,"type":"Doc","name":"Assignment 1 Solution","attachmentName":" Assignment1_sol.pdf","url":"/bbcswebdav/pid-2399419-dt-content-rid-9879580_1/xid-9879580_1"},{"id":9,"parent":0,"type":"Doc","name":"Test 1 Solution","attachmentName":" Test1_sol.pdf","url":"/bbcswebdav/pid-2408006-dt-content-rid-9947505_1/xid-9947505_1"},{"id":10,"parent":0,"type":"Doc","name":"Assignment 2 Solution","attachmentName":" Assignment2_sol.pdf","url":"/bbcswebdav/pid-2420095-dt-content-rid-10076281_1/xid-10076281_1"},{"id":11,"parent":0,"type":"Doc","name":"Test 2 Solution","attachmentName":" Test2_sol.pdf","url":"/bbcswebdav/pid-2421084-dt-content-rid-10101060_1/xid-10101060_1"},{"id":12,"parent":5,"type":"Doc","name":"Introduction to Matlab","attachmentName":" matlabTut.docx matlabTut_sol.docx","url":"/bbcswebdav/pid-2392363-dt-content-rid-9835952_1/xid-9835952_1"},{"id":13,"parent":3,"type":"Doc","name":"Introduction","attachmentName":" Introduction.pptx","url":"/bbcswebdav/pid-2356433-dt-content-rid-9763096_1/xid-9763096_1"},{"id":14,"parent":3,"type":"Doc","name":"Fourier analysis","attachmentName":" Fourier (for distribution).pptx","url":"/bbcswebdav/pid-2356435-dt-content-rid-9763098_1/xid-9763098_1"},{"id":15,"parent":3,"type":"Doc","name":"Convolution","attachmentName":" Convolution (for distribution).pptx","url":"/bbcswebdav/pid-2387896-dt-content-rid-9815376_1/xid-9815376_1"},{"id":16,"parent":3,"type":"Doc","name":"Z-transform","attachmentName":" Ztransform (for distribution).pptx","url":"/bbcswebdav/pid-2392211-dt-content-rid-9835185_1/xid-9835185_1"},{"id":17,"parent":3,"type":"Doc","name":"FIR Filter","attachmentName":" FIR (for distribution).pptx","url":"/bbcswebdav/pid-2396286-dt-content-rid-9862738_1/xid-9862738_1"},{"id":18,"parent":3,"type":"Doc","name":"IIR Filter","attachmentName":" IIR (for distribution).pptx","url":"/bbcswebdav/pid-2408055-dt-content-rid-9947332_1/xid-9947332_1"},{"id":19,"parent":3,"type":"Doc","name":"Statistical Signal Processing","attachmentName":" Statistical DSP (for distribution).pptx","url":"/bbcswebdav/pid-2413399-dt-content-rid-9993156_1/xid-9993156_1"},{"id":20,"parent":3,"type":"Doc","name":"Adaptive Filter","attachmentName":" Adaptive filter 3 (for distribution).pptx","url":"/bbcswebdav/pid-2416941-dt-content-rid-10030996_1/xid-10030996_1"},{"id":21,"parent":4,"type":"Doc","name":"Quiz 1 Solution","attachmentName":" Quiz1_sol.pdf","url":"/bbcswebdav/pid-2372832-dt-content-rid-9786988_1/xid-9786988_1"},{"id":22,"parent":4,"type":"Doc","name":"Quiz 2 Solution","attachmentName":" Quiz2_sol.pdf","url":"/bbcswebdav/pid-2383706-dt-content-rid-9799636_1/xid-9799636_1"},{"id":23,"parent":4,"type":"Doc","name":"Quiz 3 Solution","attachmentName":" Quiz3_sol.pdf","url":"/bbcswebdav/pid-2391825-dt-content-rid-9833400_1/xid-9833400_1"},{"id":24,"parent":4,"type":"Doc","name":"Quiz 4 Solution","attachmentName":" Quiz4_sol.pdf","url":"/bbcswebdav/pid-2391826-dt-content-rid-9833801_1/xid-9833801_1"},{"id":25,"parent":4,"type":"Doc","name":"Quiz 5 Solution","attachmentName":" Quiz5_sol.pdf","url":"/bbcswebdav/pid-2397895-dt-content-rid-9873055_1/xid-9873055_1"},{"id":26,"parent":4,"type":"Doc","name":"Quiz 6 Solution","attachmentName":" Quiz6_sol.pdf","url":"/bbcswebdav/pid-2397896-dt-content-rid-9873056_1/xid-9873056_1"},{"id":27,"parent":4,"type":"Doc","name":"Quiz 7 Solution","attachmentName":" Quiz7_sol.pdf","url":"/bbcswebdav/pid-2397898-dt-content-rid-9873057_1/xid-9873057_1"},{"id":28,"parent":4,"type":"Doc","name":"Quiz 8 Solution","attachmentName":" Quiz8_sol.pdf","url":"/bbcswebdav/pid-2405483-dt-content-rid-9924842_1/xid-9924842_1"},{"id":29,"parent":4,"type":"Doc","name":"Quiz 9 Solution","attachmentName":" Quiz9_sol.pdf","url":"/bbcswebdav/pid-2408198-dt-content-rid-9947863_1/xid-9947863_1"},{"id":30,"parent":4,"type":"Doc","name":"Quiz 10 Solution","attachmentName":" Quiz10_sol.pdf","url":"/bbcswebdav/pid-2413375-dt-content-rid-9993151_1/xid-9993151_1"},{"id":31,"parent":4,"type":"Doc","name":"Quiz 11 Solution","attachmentName":" Quiz11_sol.pdf","url":"/bbcswebdav/pid-2413377-dt-content-rid-9993152_1/xid-9993152_1"},{"id":32,"parent":4,"type":"Doc","name":"Quiz 12 Solution","attachmentName":" Quiz12_sol.pdf","url":"/bbcswebdav/pid-2416939-dt-content-rid-10030994_1/xid-10030994_1"},{"id":33,"parent":4,"type":"Doc","name":"Quiz 13 Solution","attachmentName":" Quiz13_sol.pdf","url":"/bbcswebdav/pid-2416940-dt-content-rid-10030995_1/xid-10030995_1"},{"id":34,"parent":4,"type":"Doc","name":"Quiz 14 Solution","attachmentName":" Quiz14_sol.pdf","url":"/bbcswebdav/pid-2417955-dt-content-rid-10044075_1/xid-10044075_1"}];

		unsafeWindow.contentList = contentList;
		this.ui.tree.update(contentList);
		this.ui.tree.openAll();
	}
}