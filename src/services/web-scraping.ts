import * as $ from 'jquery';
import * as Bluebird from 'bluebird';

import { Event } from './event';
import { Http } from './http';
import { Tree } from '../view/ui-component/tree';


class Counter {
	id: number = 0;
	get =  () => this.id++;
	set = (val) => this.id = val;
}

export interface FileContent {
	id             : number
	type           : string
	name           : string
	url?           : string
	attachmentName?: string
	parent?        : number
}

export interface DownloadListItem {
	id  : number
	name: string
	path: string
	url : string
}
export interface DownloadFileItem {
	id  : number
	name: string
	path: string
	data: string
	url : string
}



export interface GetContentArrayCallbacks {
	onUpdate: (_contentArray: FileContent[]) => void
	onCompleted: (contentArray: FileContent[]) => void
}

export interface DownloadFilesCallbacks {
	onStartDownload: (list: DownloadListItem[]) => void
	onFileDownloaded: (file: DownloadFileItem) => void
	onAllDownloaded: (files: DownloadFileItem[]) => void
}

interface GetFileArrayData {
	contentArray: FileContent[]
	counter: Counter
	updateCallback: () => void
}


export class WebScraping {

	getCourseName(document: Document) {
		return $(document).find("#courseMenuPalette_paletteTitleHeading a.comboLink").text();		
	}

	getContentArray(document: Document, callbacks: GetContentArrayCallbacks) {
		var contentArray: FileContent[] = [];
		
		let counter = new Counter();
		let commonData = {
			contentArray: contentArray, 
			counter: counter, 
			updateCallback: () => callbacks.onUpdate(contentArray)
		};

		Bluebird.map(this.getContentUrlArray(document), contentUrl => {
				let parentContent = {
					id    : counter.get(),
					parent: undefined,
					type  : "Folder",
					name  : contentUrl.name,
					url   : contentUrl.url
				};
				contentArray[parentContent.id] = parentContent;
			
				return Http.downloadPage(contentUrl.url)
					.then(html => this.getFileArray(html, parentContent.id, commonData))
			})
			.then(() => callbacks.onCompleted(contentArray));
	}

	private getContentUrlArray(document: Document) {
		return $(document)
			.find("#courseMenuPalette_contents>li>a[href^='/webapps/blackboard/content/listContent.jsp']")
			.toArray()
			.map(item => ({ 
				url : <string> (<any> item).href,
				name: $(item).find("span").attr("title")
			}));
	}

	private getFileArray(html: string, parentId: number, data: GetFileArrayData) {
		let isDefined = (obj) => obj !== undefined;
		
		return new Bluebird<void>((resolve, reject) => {
			var deferredTask: Bluebird<void>[] = []; // for each folder

			let getFileContent = (item: HTMLElement, id: number) => {
				let fileName = $(item).find("div.item a>span").text(),
					fileUrl  = $(item).find("div.item a").attr("href");
				
				data.contentArray[id] = ({
					id    : id,
					parent: isDefined(parentId) ? parentId: undefined,
					type  : "File",
					name  : fileName,
					url   : fileUrl
				});
			};
			let getDocumentContent = (item: HTMLElement, id: number) => {
				let docName     = $(item).find("div.item span+span").text(),
					docFileName = $(item).find("div.details .attachments a").text(),
					docUrl      = $(item).find("div.details .attachments a").attr("href");
				
				data.contentArray[id] = ({
					id            : id,
					parent        : isDefined(parentId) ? parentId: undefined,
					type          : "Doc",
					name          : docName,
					attachmentName: docFileName,
					url           : docUrl
				});
			};
			let getFolderContent = (item: HTMLElement, id: number) => {
				let folderName = $(item).find("div.item a>span").text(),
					folderUrl  = $(item).find("div.item a").attr("href");

				data.contentArray[id] = ({
					id    : id,
					parent: isDefined(parentId) ? parentId: undefined,
					type  : "Folder",
					name  : folderName,
					url   : folderUrl
				});

				deferredTask.push(
					Http.downloadPage(folderUrl)
						.tap(html => console.log("download! id:", id))
						.then(html => this.getFileArray(html, id, data))
				);
			};


			$(html).find("li[id^='contentListItem']").each((_, item) => {
				let id = data.counter.get();
				
				let iconSrc = (<HTMLImageElement> $(item).find(".item_icon")[0]).src;
				let isFile 		= this._endsWith(iconSrc, "file_on.gif"),
					isDocument  = this._endsWith(iconSrc, "document_on.gif"),
					isFolder 	= this._endsWith(iconSrc, "folder_on.gif");
				
				if(isFile) 			getFileContent(item, id);
				else if(isDocument) getDocumentContent(item, id);
				else if(isFolder) 	getFolderContent(item, id);
			});


			if(deferredTask.length === 0) {
				data.updateCallback();
				resolve();
			} else {
				Bluebird.all(deferredTask).then(() => {
					data.updateCallback();
					resolve();
				});
			}
		});
	}

	downloadFiles(contentArray: FileContent[], tree: Tree, fileDict: Map<DownloadFileItem>, callbacks: DownloadFilesCallbacks) {

		this.prepareDownloadList(contentArray, tree)
			.then(downloadList => this.removeDuplicateFile(downloadList, fileDict))
			.tap(downloadList => callbacks.onStartDownload(downloadList))
			.map<DownloadListItem, DownloadFileItem>(item => 
				Http.downloadFile(item.url)
					.then(result => ({
						id: item.id,
						name: item.name,
						path: item.path,
						data: result.response,
						url: result.responseURL
					}))
					.tap(file => callbacks.onFileDownloaded(file))
			)
			.then(fileArray => callbacks.onAllDownloaded(fileArray));
	}

	private prepareDownloadList(contentArray: FileContent[], tree: Tree) {
		return new Bluebird<DownloadListItem[]>((resolve, reject) => {
			var downloadList: DownloadListItem[] = [];

			tree.forEach(viewItem => {
				if(viewItem.type === "Folder") return;

				var selected = tree.tree.is_selected(viewItem),
					undetermined = tree.tree.is_undetermined(viewItem);

				if(selected || undetermined) {
					var fileItem = contentArray[viewItem.id];

					downloadList.push({
						id: viewItem.id,
						name: viewItem.text, 
						path: tree.getFolderPath(fileItem.parent, contentArray), 
						url: fileItem.url
					});
				}

			});  

			resolve(downloadList);
		});
	}

	private removeDuplicateFile(downloadList: DownloadListItem[], fileDict: Map<DownloadFileItem>) {
		return new Bluebird<DownloadListItem[]>((resolve, reject) => {
            var filtered = downloadList.filter(item => !fileDict[item.id]);
			//console.log("filtered:", filtered);
            resolve(filtered);
		});
	}
	
	private _endsWith(str: string, pattern: string) {
		var d = str.length - pattern.length;
		return d >= 0 && str.indexOf(pattern, d) === d;
	}
}

function mergeAsArray<T>(a: any, b: any) {
	var array = [];
	for(var _prop in a) if(a.hasOwnProperty(_prop)) array[_prop] = a[_prop];
	for(var _prop in b) if(b.hasOwnProperty(_prop)) array[_prop] = b[_prop];
	return <T[]> array;
}