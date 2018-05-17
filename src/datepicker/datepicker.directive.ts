import {
    Directive, OnInit, ElementRef, Renderer2, ViewContainerRef,
    Input, ComponentRef, Output, EventEmitter, forwardRef, OnChanges, AfterContentInit
} from '@angular/core';
import { ComponentLoaderFactory, ComponentLoader } from 'ngx-bootstrap/component-loader';
import { ThyDatepickerContainerComponent } from './datepicker-container.component';
import { ThyDatepickerConfig } from './datepicker.config';
import { DatepickerValueEntry } from './i.datepicker';
import { ThyDatepickerService } from './datepicker.service';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeZhHans from '@angular/common/locales/zh-Hans';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { isObject, isNumber, isDate, inputValueToBoolean } from '../util/helpers';
registerLocaleData(localeZhHans, 'zh-Hans');

const FORMAT_RULES = {
    default: 'yyyy-MM-dd',
    short: 'yyyy-MM-dd',
    full: 'yyyy-MM-dd HH:mm',
};

const DATEPICKER_VALUE_ACCESSOR = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ThyDatepickerDirective),
    multi: true
};

@Directive({
    selector: '[thyDatepicker]',
    providers: [DATEPICKER_VALUE_ACCESSOR]
})
export class ThyDatepickerDirective implements OnInit, AfterContentInit, ControlValueAccessor {
    dataPipe = new DatePipe('zh-Hans');
    private _valueRef: DatepickerValueEntry;
    private _value: DatepickerValueEntry;
    private _format: string;
    private _onChange = Function.prototype;
    private _onTouched = Function.prototype;
    private _isAfterContentInit = false;
    private _isFirstInitValueWithNullOnce = false; // 第一次初始化，如果为null，显示时需要为空
    private _loader: ComponentLoader<ThyDatepickerContainerComponent>;
    @Input() thyPlacement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
    @Input() thyTriggers = 'click';
    @Input() thyContainer = 'body';
    @Input() thyOutsideClick = true;
    @Input() thyDisabled = false;
    @Input() thyWithTime = false;
    @Input() thyFormat = null;
    @Output() thyOnChange: EventEmitter<any> = new EventEmitter();

    constructor(
        public _config: ThyDatepickerConfig,
        private _elementRef: ElementRef,
        private _renderer: Renderer2,
        _viewContainerRef: ViewContainerRef,
        cis: ComponentLoaderFactory,
        private datepickerService: ThyDatepickerService,
    ) {
        this._loader = cis.createLoader<ThyDatepickerContainerComponent>(
            _elementRef,
            _viewContainerRef,
            _renderer
        );
    }

    ngOnInit() {
        this._loader.listen({
            outsideClick: this.thyOutsideClick,
            triggers: this.thyTriggers,
            show: () => this.show()
        });
    }

    ngAfterContentInit() {
        this._isAfterContentInit = true;
    }

    writeValue(value: DatepickerValueEntry | Date | number) {
        this._initValueDate(value);
        if (this._isAfterContentInit) {
            this._saveInitValueClone();
            this._isFirstInitValueWithNullOnce = true;
        }
    }

    registerOnChange(fn: (value: any) => any): void {
        this._onChange = fn;
    }

    registerOnTouched(fn: () => any): void {
        this._onTouched = fn;
    }

    show() {
        if (this.thyDisabled) {
            return;
        }

        this.datepickerService.initLocale();

        this._loader.provide({ provide: ThyDatepickerConfig, useValue: this._config })
            .attach(ThyDatepickerContainerComponent)
            .to(this.thyContainer)
            .position({ attachment: this.thyPlacement })
            .show({
                hideLoader: () => {
                    this.hide();
                },
                initialState: {
                    withTime: inputValueToBoolean(this.thyWithTime),
                    value: this._value,
                    valueRef: this._valueRef,
                    changeValue: (result: DatepickerValueEntry) => {
                        this._isFirstInitValueWithNullOnce = false;
                        this._initFormatRule(result);
                        this._setInputProperty(result.date);
                        this._onChange(result);
                        this._initValueDate(result);
                    }
                }
            });
    }

    hide() {
        this._loader.hide();
    }

    private _initValueDate(value: DatepickerValueEntry | Date | number | any) {
        if (isDate(value)) {
            this._value = {
                date: value,
                with_time: false
            };
        } else if (isObject(value)) {
            this._value = value;
        } else if (isNumber(value)) {
            if (value.toString().length === 10) {
                this._value = {
                    date: new Date(value * 1000),
                    with_time: false
                };
            } else {
                this._value = {
                    date: new Date(value),
                    with_time: false
                };
            }
        } else {
            this._value = {
                date: null,
                with_time: false
            };
        }
        this._initFormatRule();
        this._setInputProperty(this._value.date);

    }

    private _saveInitValueClone() {
        if (this._value) {
            this._valueRef = {
                date: this._value.date,
                with_time: this._value.with_time
            };
        }
    }

    private _initFormatRule(value?: DatepickerValueEntry) {
        if (this.thyFormat) {
            this._format = this.thyFormat;
        } else {
            if (this._isFirstInitValueWithNullOnce) {
                this._format = '';
            } else {
                const _v = value || this._value;
                if (_v.with_time) {
                    this._format = FORMAT_RULES.full;
                } else {
                    this._format = FORMAT_RULES.short;
                }
            }
        }
    }

    private _setInputProperty(value: any) {
        const initialDate = this.dataPipe.transform(value, this._format);
        this._renderer.setProperty(this._elementRef.nativeElement, 'value', initialDate);
    }

}