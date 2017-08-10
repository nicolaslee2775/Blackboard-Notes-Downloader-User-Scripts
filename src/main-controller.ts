import * as $ from 'jquery'
import 'jquery-ui/ui/widgets/dialog'
import 'jstree'
import * as JSZip from 'jszip/dist/jszip.min'
import * as Bluebird from 'bluebird'
import * as fileSaver from 'file-saver'


import { Http } from './services/http';
import { WebScraping, FileContent, DownloadFileItem, DownloadListItem } from './services/web-scraping';

import { TreeController } from './tree-controller';
import { ViewController } from './view-controller';



declare var unsafeWindow;



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