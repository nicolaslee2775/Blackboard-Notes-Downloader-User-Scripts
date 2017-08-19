import * as $ from 'jquery';
import * as Bluebird from 'bluebird';

import { Http } from './http';
import { Tree } from '../classes/tree';


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


export class WebScraping {

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

	prepareDownloadList(contentArray: FileContent[], tree: Tree) {
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
}