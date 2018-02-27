import * as Bluebird from 'bluebird'


export namespace Http {

	export class HttpError extends Error {
		constructor(public status: number, public statusText: string) {
			super(`HttpError: ${statusText}`);

			Object.setPrototypeOf(this, HttpError.prototype); // ref: https://stackoverflow.com/a/41102306
		}
	}

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

	export function downloadFile(url: string, onProgess?: (event: ProgressEvent) => void) {
        return new Bluebird<{ response: string, responseURL: string }>(function(resolve, reject) {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (xhttp.readyState == 4) {
					if(xhttp.status == 200) {
						resolve({
							response: xhttp.response,
							responseURL: xhttp.responseURL
						});
					} else {
						reject(new HttpError(xhttp.status, xhttp.statusText));
					}
                }
			};
			if(onProgess) {
				xhttp.onprogress = function(e) {
					onProgess(e);
				};
			}
            xhttp.responseType = "blob";
            xhttp.open("GET", url, true);
            xhttp.send();
        });
    }
}