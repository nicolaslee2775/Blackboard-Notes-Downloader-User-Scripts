import * as Bluebird from 'bluebird'


export namespace Http {

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
                if (xhttp.readyState == 4 && xhttp.status == 200) {
                    resolve({
                        response: xhttp.response,
                        responseURL: xhttp.responseURL
                    });
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