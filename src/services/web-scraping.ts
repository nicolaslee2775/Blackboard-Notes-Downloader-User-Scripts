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
    fileSize?      : number
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



export interface GetContentListCallbacks {
    onUpdate: (_contentList: FileContent[]) => void
    onCompleted: (contentList: FileContent[]) => void
}

export interface DownloadFilesCallbacks {
    onStartDownload: (list: DownloadListItem[]) => void
    onFileProgress?: (id: number, event: ProgressEvent) => void
    onFileDownloaded: (file: DownloadFileItem) => void
    onFileDownloadError: (id: number, event: Event<any> | Http.HttpError) => void
    onAllDownloaded: (files: DownloadFileItem[]) => void
}

interface GetFileListData {
    contentList: FileContent[]
    counter: Counter
    updateCallback: () => void
}

export function contentListToMap(list: FileContent[]): Dict<FileContent> {
    //return list.sort((a, b) => a.id - b.id);
    var map = {};
    for(var i = 0; i < list.length; i++) map[list[i].id] = list[i];
    return map;
}
 
export class WebScraping {

    getCourseName(document: Document) {
        return $(document).find("#courseMenuPalette_paletteTitleHeading a.comboLink").text();        
    }

    getContentList(document: Document, callbacks: GetContentListCallbacks) {
        var contentList: FileContent[] = [];
        
        let counter = new Counter();
        let commonData = {
            contentList: contentList, 
            counter: counter, 
            updateCallback: () => callbacks.onUpdate(contentList)
        };

        Bluebird.map(this.getContentUrlList(document), contentUrl => {
                let parentContent = {
                    id    : counter.get(),
                    parent: undefined,
                    type  : "Folder",
                    name  : contentUrl.name,
                    url   : contentUrl.url
                };
                contentList.push(parentContent);
            
                return Http.downloadPage(contentUrl.url)
                    .then(html => this.getFileList(html, parentContent.id, commonData))
            })
            .then(() => callbacks.onCompleted(contentList));
    }

    private getContentUrlList(document: Document) {
        return $(document)
            .find("#courseMenuPalette_contents>li>a[href^='/webapps/blackboard/content/listContent.jsp']")
            .toArray()
            .map(item => ({ 
                url : <string> (<any> item).href,
                name: $(item).find("span").attr("title")
            }));
    }

    private getFileList(html: string, parentId: number, data: GetFileListData) {
        let isDefined = (obj) => obj !== undefined;
        
        return new Bluebird<void>((resolve, reject) => {
            var deferredTask: Bluebird<void>[] = []; // for each folder

            let getFileContent = (item: HTMLElement) => {
                let id = data.counter.get();
                let fileName = $(item).find("div.item a>span").text(),
                    fileUrl  = $(item).find("div.item a").attr("href");
                
                data.contentList.push({
                    id    : id,
                    parent: isDefined(parentId) ? parentId: undefined,
                    type  : "File",
                    name  : fileName,
                    url   : fileUrl
                });
            };
            let getDocumentContent = (item: HTMLElement) => {
                let docName     = $(item).find("div.item span+span").text(),
                    docFileList = $(item).find("div.details .attachments > li");

                docFileList.each((index, docFileEle) => {
                    let id = data.counter.get();
                    let docFileName  = $(docFileEle).find("a").text(),
                        docUrl       = $(docFileEle).find("a").attr("href"),
                        fileSizeText = $(docFileEle).find("[id$='fileSize']").text();
                    let fileSize: number = (function() {
                        let result = /([0-9.]+) (GB|MB|KB|B)/i.exec(fileSizeText);
                        if(result) {
                            let value = result[1], unit = result[2];
                            switch(unit) {
                                case "B": return parseFloat(value);
                                case "KB": return parseFloat(value) * 1024;
                                case "MB": return parseFloat(value) * 1024 * 1024;
                                case "GB": return parseFloat(value) * 1024 * 1024 * 1024;
                            }
                        }
                        return undefined;
                    })();
                    data.contentList.push({
                        id            : id,
                        parent        : isDefined(parentId) ? parentId: undefined,
                        type          : "Doc",
                        name          : docName,
                        attachmentName: docFileName,
                        url           : docUrl,
                        fileSize      : fileSize
                    });
                });
            };
            let getFolderContent = (item: HTMLElement) => {
                let id = data.counter.get();
                let folderName = $(item).find("div.item a>span").text(),
                    folderUrl  = $(item).find("div.item a").attr("href");

                data.contentList.push({
                    id    : id,
                    parent: isDefined(parentId) ? parentId: undefined,
                    type  : "Folder",
                    name  : folderName,
                    url   : folderUrl
                });

                deferredTask.push(
                    Http.downloadPage(folderUrl)
                        .tap(html => console.log("download! id:", id))
                        .then(html => this.getFileList(html, id, data))
                );
            };

            $(html).find("li[id^='contentListItem']").each((_, item) => {
                let id = data.counter.get();
                
                let iconSrc = (<HTMLImageElement> $(item).find(".item_icon")[0]).src;
                let isFile     = this._endsWith(iconSrc, "file_on.gif"),
                    isDocument = this._endsWith(iconSrc, "document_on.gif"),
                    isFolder   = this._endsWith(iconSrc, "folder_on.gif");
                
                if(isFile)          getFileContent(item);
                else if(isDocument) getDocumentContent(item);
                else if(isFolder)   getFolderContent(item);
            });

            Bluebird.all(deferredTask).then(() => {
                data.updateCallback();
                resolve();
            });
        });
    }

    downloadFiles(contentList: FileContent[], tree: Tree, fileDict: Dict<DownloadFileItem>, callbacks: DownloadFilesCallbacks) {
        let contentMap = contentListToMap(contentList);

        this.prepareDownloadList(contentMap, tree)
            .then(downloadList => this.removeDuplicateFile(downloadList, fileDict))
            .tap(downloadList => callbacks.onStartDownload(downloadList))
            .map<DownloadListItem, DownloadFileItem>(item => 
                Http.downloadFile(item.url, (progressEvent) => {
                        if(callbacks.onFileProgress) callbacks.onFileProgress(item.id, progressEvent);
                    })
                    .then(result => ({
                        id: item.id,
                        name: item.name,
                        path: item.path,
                        data: result.response,
                        url: result.responseURL
                    }))
                    .tap(file => callbacks.onFileDownloaded(file))
                    .catch(err => {
                        callbacks.onFileDownloadError(item.id, err);
                    })
            )
            .then(fileList => callbacks.onAllDownloaded(fileList));
    }

    private prepareDownloadList(contentMap: Dict<FileContent>, tree: Tree) {
        return new Bluebird<DownloadListItem[]>((resolve, reject) => {
            var downloadList: DownloadListItem[] = [];

            tree.forEach(viewItem => {
                if(viewItem.type === "Folder") return;

                var selected = tree.tree.is_selected(viewItem),
                    undetermined = tree.tree.is_undetermined(viewItem);

                if(selected || undetermined) {
                    var fileItem = contentMap[viewItem.id];

                    downloadList.push({
                        id: parseInt(viewItem.id), // viewItem.id is string
                        name: viewItem.text, 
                        path: tree.getFolderPath(fileItem.parent, contentMap), 
                        url: fileItem.url
                    });
                }

            });  

            resolve(downloadList);
        });
    }

    private removeDuplicateFile(downloadList: DownloadListItem[], fileDict: Dict<DownloadFileItem>) {
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