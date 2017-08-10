
type EventListener = (arg?: any) => void;

export class Event<T> {
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