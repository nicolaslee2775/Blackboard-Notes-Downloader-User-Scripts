import * as $ from 'jquery';

import { Event } from '../../services/event';
import { UiComponent } from '../view-controller';


export interface DialogParam {
}

export class Dialog implements UiComponent {
    
    ele$: JQuery<HTMLElement>;

    onClose = new Event();

    state = {
        fullscreen: <boolean> false,
        prevSize: <{
            width: number|string,
            height: number|string
        }> undefined,
        prevPos: <{
            top: number,
            left: number
        }> undefined,
    };

    constructor(private selector: string, private param?: DialogParam) {    
        this.param = this.param || {
        };
    }

    init() {
        this.ele$ = $(this.selector);
        this.ele$.dialog({
            autoOpen: false,
            modal: true,
            height: 600,
            width: '70%',
            //position: 'absolute',
            close: () => this.onClose.notify()
        });
        $(".ui-dialog").css("position", "absolute"); // Unknown issue: the position of ui-dialog would become 'relative'

        this.ele$.siblings(".ui-dialog-titlebar").on("click", () => this._onTitleClick());
        this.ele$.siblings(".ui-dialog-titlebar").on("dblclick", () => this._onTitleDoubleClick());
    }

    open() {
        this.ele$.dialog("open");
    }

    private _onTitleClick() {
        
    }

    private _onTitleDoubleClick() {
        this.state.fullscreen = !this.state.fullscreen;

        let container = this.ele$.parent();
        let animate = () => {
            let t = 500;
            this.ele$.css("transition", `height ${t}ms`);
            container.css("transition", `width ${t}ms, top ${t}ms, left ${t}ms`);
            setTimeout(() => {
                this.ele$.css("transition", ``);
                container.css("transition", ``);
            }, t);
        };

        if(this.state.fullscreen) {
            /*this.state.prevSize = {
                width: container[0].style.width,//container.width(),
                height: container.outerHeight(),
            };*/
            this.state.prevSize = {
                width: container.width(),
                height: this.ele$.height()
            };
            this.state.prevPos = container.position();


            animate();    
            /*this.ele$.dialog({
                width: 'calc(100% - 30px)',
                height: window.innerHeight - 30
            });*/
            this.ele$.height("calc(100vh - 85px)");
            container.width("calc(100% - 30px)");
            container.css("top", 7.5015);
            container.css("left", 11.4);


        } else {
            if(this.state.prevSize && this.state.prevPos) {        
                animate();
                /*this.ele$.dialog({
                    width: this.state.prevSize.width,
                    height: this.state.prevSize.height
                });*/
                this.ele$.height(this.state.prevSize.height);
                container.width(this.state.prevSize.width);
                container.css("top", this.state.prevPos.top);
                container.css("left", this.state.prevPos.left);
            }
        }
        
    }
}