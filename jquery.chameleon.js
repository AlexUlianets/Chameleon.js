/*
 * Chameleon - jQuery plugin for colorize content
 *
 * Copyright (c) 2017 Vadim Fedorov
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 *  http://vadimfedorov.ru/chameleon
 *
 */

'use strict';

(function ($, window, undefined) {
    var _s = {
            color: {
                black: '#000000',
                white: '#ffffff',
                adapt_limit: 200,
                alpha: 200,
                distinction: 120,
                readable_lum_diff: 5,
                lum_step: 0.05
            },
            limits: {
                color_alpha: {
                    min: 0,
                    max: 255
                },
                color_distinction: {
                    min: 50,
                    max: 765
                },
                color_adapt_limit: {
                    min: 0,
                    max: 1000
                }
            },
            canvas: {
                add_w: 10,
                add_h: 10
            },
            actions: {

            },
            sel: {
                chmln: '.chmln',
                chmln_canvas: '.chmln__canvas',
                chmln_img: '.chmln__img',
                chmln_colors: '.chmln__colors',
                chmln_async_colorize: '.chmln_async_colorize',
                chmln_colorize_done: '.chmln_colorize_done'
            },
            $: {},
            tpl: {}
        },
        _d = {},
        _f = {
            debug: false
        };

    var clearSel = function(sel) {
            return sel.slice(1);
        },
        isUndefined = function(val) {
            return typeof val === 'undefined';
        },
        toggleDebug = function(options) {
            _f.debug = options ? !!options.debug : false;
        },
        logger = function(msg, type) {
            if (_f.debug) {
                type = type || 'log';

                var logAction = {
                    'error': function(m) {
                        console.error('Chameleon.js:', m);
                    },
                    'warn': function(m) {
                        console.warn('Chameleon.js:', m);
                    },
                    'log': function(m) {
                        console.log('Chameleon.js:', m);
                    }
                };

                if (isUndefined(msg)) {
                    logAction.error('Msg given to logger is undefined!');
                } else {
                    if (logAction.hasOwnProperty(type)) {
                        logAction[type](msg);
                    } else {
                        logAction.error(['Unknown logAction type!', type]);
                    }
                }
            }
        },
        getStopColorize = function($elem, val, remove) {
            if ($elem && $elem.length) {
                if (!isUndefined(val)) {
                    if ($elem.hasClass(clearSel(_s.sel.chmln_async_colorize))) {
                        $elem.attr('data-stopColorize', val);
                    } else {
                        logger('Cant stop colorize in not async_colorize mode!', 'warn');
                    }
                }

                if (remove) {
                    $elem.removeAttr('data-stopColorize');
                }

                return $elem.attr('data-stopColorize');
            } else {
                logger('getStopColorize $elem not given or all $elems are already colorized!', 'warn');
            }
        },
        getDefaultSettings = function(options) {
            options = options || {};

            var type = options.settings_type || 'colorizeContent',
                settings = {
                    'colorizeContent': {
                        settings_type: 'colorizeContent',
                        dummy_back: 'aaaaaa',
                        dummy_front: '555555',
                        color_alpha: _s.color.alpha,
                        color_distinction: _s.color.distinction,
                        color_adapt_limit: _s.color.adapt_limit,
                        debug: false,
                        async_colorize: true,
                        apply_colors: true,
                        adapt_colors: true,
                        all_colors: false,
                        insert_colors: false,
                        data_colors: false,
                        object_color: false,
                        rules: {},
                        afterColorized: function() {},
                        beforeAsyncColorized: function() {},
                        afterAsyncColorized: function() {}
                    },
                    'getImageColors': {
                        settings_type: 'getImageColors',
                        sort_colors: 'primary',
                        color_alpha: _s.color.alpha,
                        color_distinction: _s.color.distinction,
                        debug: false,
                        object_color: false,
                        onGetColorsSuccess: function(colors, $container, settings) {
                            logger(['getImageColors - onGetColorsSuccess is not given!', colors, $container, settings], 'warn');
                        },
                        onGetColorsError: function(colors, $container, settings) {
                            logger(['getImageColors - error on img load!', colors, $container, settings], 'error');
                        }
                    }
                };

            if (settings[type]) {
                return $.extend(settings[type], options.settings_values || {});
            }

            logger('getDefaultSettings - Unknown settings type given "' + type + '"!', 'warn');

            return {};
        },
        extendSettings = function(settings, options) {
            return $.extend(settings || {}, options || {});
        },
        validateSettings = function(settings) {
            if (typeof settings === 'object') {
                toggleDebug(settings);

                var fixed_settings = $.extend({}, settings),
                    allowed_values = {
                        'settings_type': ['colorizeContent', 'getImageColors'],
                        'sort_colors': ['primary', 'hue']
                    },
                    val_types = [
                        {
                            type: 'number',
                            msg: function(prop) {
                                return 'Should be a number.' + ' Min: ' + _s.limits[prop].min + ', max: ' + _s.limits[prop].max + '.';
                            },
                            items: ['color_alpha', 'color_distinction', 'color_adapt_limit']
                        },
                        {
                            type: 'string',
                            msg: function() {
                                return 'Should be a string.';
                            },
                            items: ['settings_type', 'sort_colors']
                        },
                        {
                            type: 'hex',
                            msg: function() {
                                return 'Should be a hex color: #xxx or #xxxxxx.';
                            },
                            items: ['dummy_back', 'dummy_front', 'hex', 'color']
                        },
                        {
                            type: 'boolean',
                            msg: function() {
                                return 'Should be a boolean value: true or false.';
                            },
                            items: ['debug', 'async_colorize', 'apply_colors', 'adapt_colors', 'all_colors', 'insert_colors', 'data_colors', 'object_color']
                        },
                        {
                            type: 'object',
                            msg: function() {
                                return 'Should be an object.';
                            },
                            items: ['$img', 'rules', 'settings_values']
                        },
                        {
                            type: 'function',
                            msg: function() {
                                return 'Should be a function.';
                            },
                            items: ['afterColorized', 'beforeAsyncColorized', 'afterAsyncColorized', 'onGetColorsSuccess', 'onGetColorsError']
                        }
                    ],
                    fixVal = function(val, is_valid, fixCB) {
                        var fixed_val = val;

                        if (typeof fixCB === 'function' && !is_valid) {
                            fixed_val = fixCB(val);
                        }

                        return {
                            is_valid: is_valid,
                            fixed_val: fixed_val
                        };
                    },
                    validation = {
                        numberValidation: function(val, name) {
                            val = parseFloat(val);

                            var is_valid = true;

                            if (_s.limits.hasOwnProperty(name)) {
                                is_valid = !isNaN(val) && _s.limits[name].min <= val && val <= _s.limits[name].max;
                            } else {
                                logger('validateSettings/checkNumberValue - limits for number setting "' + name + '" are missing!', 'warn');
                            }

                            return fixVal(val, is_valid, function(v) {
                                if (isNaN(v)) {
                                    v = _s.limits[name].min;
                                } else {
                                    v = Math.min(Math.max(v, _s.limits[name].min), _s.limits[name].max);
                                }

                                return v;
                            });
                        },
                        stringValidation: function(val) {
                            return fixVal(val, typeof val === 'string', function(v) {
                                return String(v);
                            });
                        },
                        hexValidation: function(val) {
                            var is_valid = true,
                                checkColorValue = function(v) {
                                    v = parseInt(v, 10);

                                    var valid_val = true;

                                    if (isNaN(v)) {
                                        valid_val = false;
                                    } else if (v < 0 || v > 255) {
                                        valid_val = false;
                                    }

                                    return valid_val;
                                };

                            if (typeof val === 'string') {
                                is_valid = /^#[0-9a-f]{6}$/i.test(addHashToHex(val).toLowerCase())
                            } else if (Array.isArray(val)) {
                                $.each(val, function(i, v) {
                                    if (!checkColorValue(v)) {
                                        is_valid = false;
                                        return false;
                                    }
                                });
                            } else if (typeof val === 'object') {
                                if (!checkColorValue(val.r) || !checkColorValue(val.g) || !checkColorValue(val.b) || !checkColorValue(val.alpha)) {
                                    is_valid = false;
                                }
                            }

                            return fixVal(val, is_valid, function(v) {
                                return clearHex(v);
                            });
                        },
                        booleanValidation: function(val) {
                            return fixVal(val, typeof val === 'boolean', function(v) {
                                return !!v;
                            });
                        },
                        objectValidation: function(val) {
                            return fixVal(val, typeof val === 'object', function(v) {
                                return {};
                            });
                        },
                        functionValidation: function(val) {
                            return fixVal(val, typeof val === 'function', function(v) {
                                return function() {};
                            });
                        }
                    },
                    checkProps = function(settings) {
                        var check = [];

                        for (var prop in settings) {
                            if (settings.hasOwnProperty(prop)) {
                                check.push(checkProp(settings[prop], prop));
                            }
                        }

                        return check;
                    },
                    checkProp = function(val, prop) {
                        var type = false,
                            msg = '';

                        $.each(val_types, function(index, val_type) {
                            if (val_type.items.indexOf(prop) !== -1) {
                                type = val_type.type;
                                msg = val_type.msg(prop);

                                return false;
                            }
                        });

                        if (type) {
                            var validated_item = validation[type + 'Validation'](val, prop);

                            if (allowed_values.hasOwnProperty(prop) && allowed_values[prop].indexOf(val) === -1) {
                                validated_item.fixed_val = allowed_values[prop][0];
                                validated_item.is_valid = false;
                                msg = 'Not allowed value for "' + prop + '". You can use only: [' + allowed_values[prop].join(', ') + '].';
                            }

                            return {
                                prop: prop,
                                val: val,
                                fixed_val: validated_item.fixed_val,
                                valid: validated_item.is_valid,
                                msg: msg
                            };
                        }

                        logger('validateSettings - Unknown val_type "' + prop + '".', 'warn');

                        return {
                            prop: prop,
                            val: val,
                            fixed_val: val,
                            valid: false,
                            msg: 'Unknown value type "' + prop + '".'
                        };
                    },
                    isNotValid = function(c) { return !c.valid; };

                var invalid = checkProps(settings).filter(isNotValid);

                $.each(invalid, function(index, item) {
                    fixed_settings[item.prop] = item.fixed_val;
                });

                return {
                    invalid: invalid,
                    fixed_settings: fixed_settings
                };
            }

            return {
                invalid: [],
                fixed_settings: settings
            };
        },
        setElemAttributes = function ($elem, attrs) {
            for (var a in attrs) {
                if (attrs.hasOwnProperty(a)) {
                    $elem.attr(a, attrs[a]);
                }
            }

            return $elem;
        },
        sortArrByValue = function (arr) {
            var tmp_arr = [],
                new_arr = [];

            for (var k in arr) {
                if (arr.hasOwnProperty(k)) {
                    tmp_arr.push([k, arr[k]]);
                }
            }

            tmp_arr.sort(function (a, b) {
                return b[1] - a[1];
            });

            for (var i = 0; i < tmp_arr.length; i += 1) {
                new_arr[tmp_arr[i][0]] = tmp_arr[i][1];
            }

            return new_arr;
        },
        decToHexadec = function (dec, pad) {
            pad = pad || 2;

            var hex = Number(dec).toString(16);

            while (hex.length < pad) {
                hex = '0' + hex;
            }

            return hex;
        },
        addHashToHex = function(hex) {
            if (hex) {
                return '#' + String(hex).replace(/#/g, '');
            }

            return '';
        },
        clearHex = function(hex) {
            if (hex) {
                hex = String(hex).replace(/[^0-9a-f]/gi, '').toLowerCase();

                if (hex.length < 6) {
                    if (hex.length >= 3) {
                        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                    } else {
                        hex = _s.color.black;
                    }
                }

                if (hex.length > 6) {
                    hex = hex.slice(0, 6);
                }

                return hex;
            }

            return '';
        },
        convertAlphaToPercent = function(a) {
            a = parseInt(a, 10);

            if (isNaN(a)) {
                a = 1;
            } else {
                a = ((parseInt(a, 10) / (255 / 100)) / 100).toFixed(2);
            }

            return Math.min(1, a);
        },
        colorObjectFromHex = function(hex, alpha) {
            hex = clearHex(hex);
            alpha = alpha ? convertAlphaToPercent(alpha) : 1;

            var r_index = 0,
                g_index = 2,
                b_index = 4,
                full_index = 6,
                hue_step = 360,
                r = parseInt(hex.substr(r_index, 2), 16),
                g = parseInt(hex.substr(g_index, 2), 16),
                b = parseInt(hex.substr(b_index, 2), 16),
                max = Math.max(r, g, b),
                min = Math.min(r, g, b),
                val = max,
                chr = max - min,
                hue = 0,
                sat = 0;


            if (val > 0) {
                sat = chr / val;

                if (sat > 0) {
                    if (r === max) {
                        hue = (r_index * hue_step) + hue_step * (((g - min) - (b - min)) / chr);

                        if (hue < 0) {
                            hue += full_index * hue_step;
                        }
                    } else if (g === max) {
                        hue = (g_index * hue_step) + hue_step * (((b - min) - (r - min)) / chr);
                    } else if (b === max) {
                        hue = (b_index * hue_step) + hue_step * (((r - min) - (g - min)) / chr);
                    }
                }
            }

            return {hex: hex, r: r, g: g, b: b, alpha: alpha, chroma: chr, hue: hue, sat: sat, val: val};
        },
        getRGBAString = function(c) {
            return c ? 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + c.alpha + ')' : '';
        },
        rgbToHex = function(color) {
            var hex = '';

            if (Array.isArray(color)) {
                for (var i = 0; i < 3; i += 1) {
                    hex += decToHexadec(color[i]);
                }
            } else if (typeof color === 'object') {
                hex += decToHexadec(color.r) + decToHexadec(color.g) + decToHexadec(color.b);
            }

            return clearHex(hex);
        },
        lumDiff = function (rgb1, rgb2) {
            var getLum = function(c) {
                    var r = 0.2126,
                        g = 0.7152,
                        b = 0.0722,
                        a = 255,
                        p = 2.2;

                    return r * Math.pow(c.r / a, p) + g * Math.pow(c.g / a, p) + b * Math.pow(c.b / a, p);
                },
                l1 = getLum(rgb1),
                l2 = getLum(rgb2),
                g = 0.05;

            return l1 > l2 ? (l1 + g) / (l2 + g) : (l2 + g) / (l1 + g);
        },
        changeColorLum = function (hex, multiplier) {
            hex = clearHex(hex);

            multiplier = multiplier || 0;

            var new_hex = '', c;

            for (var i = 0; i < 3; i += 1) {
                c = parseInt(hex.substr(i * 2, 2), 16);
                c = Math.round(Math.min(Math.max(0, c + (c * multiplier)), 255)).toString(16);
                new_hex += ('00' + c).substr(c.length);
            }

            return addHashToHex(new_hex);
        },
        findReadableColor = function (back_rgb, front_rgb, front_hex, lum_dir, limit) {
            var new_hex = '',
                lum_step = _s.color.lum_step,
                try_num = 1;

            while (lumDiff(back_rgb, front_rgb) < _s.color.readable_lum_diff) {
                new_hex = changeColorLum(front_hex, lum_dir * lum_step * try_num);
                try_num += 1;
                front_rgb = colorObjectFromHex(new_hex);

                if (try_num > limit) {
                    break;
                }
            }

            return try_num > limit ? (lum_dir > 0 ? _s.color.white : _s.color.black) : new_hex;
        },
        whiteOrBlack = function(hex) {
            return lumDiff(colorObjectFromHex(hex), colorObjectFromHex(_s.color.black)) >= _s.color.readable_lum_diff ? _s.color.black : _s.color.white;
        },
        makeColorReadable = function (back_hex, limit, front_hex) {
            var back_rgb = colorObjectFromHex(back_hex),
                front_rgb = colorObjectFromHex(front_hex),
                new_hex = '',
                lum_dir = 1;

            if (lumDiff(back_rgb, front_rgb) >= _s.color.readable_lum_diff) {
                new_hex = addHashToHex(front_hex);
            } else {
                if (lumDiff(back_rgb, colorObjectFromHex(_s.color.black)) >= _s.color.readable_lum_diff) {
                    lum_dir = -1;
                }

                new_hex = findReadableColor(back_rgb, front_rgb, front_hex, lum_dir, limit);
            }

            return new_hex;
        },
        getColorElem = function (options) {
            if (options) {
                options.color = options.color || '';
                options.source_color = options.source_color || '';

                var color = typeof options.color === 'object' ?
                        getRGBAString(options.color) :
                        addHashToHex(clearHex(options.color)),
                    source_color = typeof options.source_color === 'object' ?
                        getRGBAString(options.source_color) :
                        addHashToHex(clearHex(options.source_color));

                var $container = $('<div class="chmln__colors-elem-wrapper">'),
                    $hex_elem = $('<span class="chmln__colors-elem">'),
                    $source_hex_elem = $('<span class="chmln__colors-elem _source">'),
                    $adapt_arrow = $('<span class="chmln__colors-arrow">'),
                    is_hex_adapted = source_color && source_color !== color,
                    colorElem = function ($elem, color, html, origin_color) {
                        var text_color = whiteOrBlack(typeof origin_color === 'object' ? origin_color.hex : origin_color);

                        $elem.css({'background-color': color, 'color': text_color}).html(html);
                    };

                colorElem($hex_elem, color, color, options.color);

                if (is_hex_adapted) {
                    colorElem($source_hex_elem, source_color, source_color, options.source_color);
                    colorElem($adapt_arrow, source_color, '&#8594', options.source_color);

                    $hex_elem.addClass('_adapted');
                    $source_hex_elem.append($adapt_arrow);
                    $container.append($source_hex_elem);
                }

                $container.append($hex_elem);

                return $container;
            }
        },
        sortImageColors = function(options) {
            if (options) {
                options.type = options.type || 'primary';

                var sortColors = {
                    'primary': function(colors) {
                        return colors;
                    },
                    'hue': function(colors) {
                        return colors.sort(function(a, b) { return a.hue - b.hue; });
                    }
                };

                if (sortColors.hasOwnProperty(options.type) && options.colors && options.colors.length) {
                    return sortColors[options.type](options.colors);
                } else {
                    logger('sortImageColors - Unknown sort type "' + options.type + '".', 'warn');
                }
            }

            return [];
        },
        parseImageColors = function($container, img_src, settings, onImgLoad, onImgError) {
            var $img = $('<img>');

            $img.on({
                'load': function (e) {
                    var target_img = e.target,
                        canvas_w = target_img.width + _s.canvas.add_w,
                        canvas_h = target_img.height + _s.canvas.add_h,
                        $old_canvas = $container.find(_s.sel.chmln_canvas),
                        $canvas = setElemAttributes($('<canvas>'), {
                            'class': clearSel(_s.sel.chmln_canvas),
                            'style': 'display: none;',
                            'width': canvas_w,
                            'height': canvas_h
                        });

                    $old_canvas.remove();
                    $container.append($canvas);

                    var ctx = $canvas[0].getContext("2d"),
                        img_colors = [];

                    ctx.clearRect(0, 0, canvas_w, canvas_h);
                    ctx.drawImage(target_img, 0, 0);

                    var pix = ctx.getImageData(0, 0, canvas_w, canvas_h).data,
                        rgba_key = '';

                    for (var i = 0; i < pix.length; i += 4) {
                        if (pix[i + 3] >= settings.color_alpha) {
                            rgba_key = pix[i] + ',' + pix[i + 1] + ',' + pix[i + 2] + ',' + pix[i + 3];

                            if (img_colors[rgba_key]) {
                                img_colors[rgba_key] += 1
                            } else {
                                img_colors[rgba_key] = 1
                            }
                        }
                    }

                    var sorted_colors = sortArrByValue(img_colors),
                        used_colors = [];

                    img_colors = [];

                    for (var rgba_string in sorted_colors) {
                        if (sorted_colors.hasOwnProperty(rgba_string)) {
                            var rgba_arr = rgba_string.split(','),
                                is_valid = true;

                            for (var l = 0; l < used_colors.length; l += 1) {
                                var color_distinction = 0,
                                    used_rgba_arr = used_colors[l].split(',');

                                for (var m = 0; m < 3; m += 1) {
                                    color_distinction += Math.abs(rgba_arr[m] - used_rgba_arr[m]);
                                }

                                if (color_distinction <= settings.color_distinction) {
                                    is_valid = false;

                                    break;
                                }
                            }

                            if (is_valid) {
                                used_colors.push(rgba_string);
                                img_colors.push(colorObjectFromHex(rgbToHex(rgba_arr), rgba_arr[3]));
                            }
                        }
                    }

                    if (settings.sort_colors) {
                        img_colors = sortImageColors({type: settings.sort_colors, colors: img_colors});
                    }

                    if (!settings.object_color) {
                        img_colors = img_colors.map(function(c) { return c.hex; })
                    }

                    onImgLoad(img_colors, $container, settings);
                },
                'error': function() {
                    onImgError([], $container, settings);
                }
            });

            $img.attr('src', img_src);
        },
        colorizeElem = function (item_elem, img_colors, settings) {
            var $elem = item_elem || [],
                item_colors = [];

            if ($elem.length) {
                var marks = [],
                    background = img_colors[0] || clearHex(settings.dummy_back),
                    mark_amt_affix = 1,
                    cur_marks = $elem.find(_s.sel.chmln + mark_amt_affix);

                item_colors.push(addHashToHex(background));

                while (cur_marks.length > 0) {
                    marks.push(cur_marks);
                    mark_amt_affix += 1;
                    cur_marks = $elem.find(_s.sel.chmln + mark_amt_affix);
                }

                while (img_colors.length < mark_amt_affix) {
                    img_colors.push(clearHex(settings.dummy_front));
                }

                if (settings.adapt_colors) {
                    var adapted_colors =
                        img_colors
                            .slice(1, mark_amt_affix)
                            .map(makeColorReadable.bind(this, background, settings.color_adapt_limit));

                    item_colors = item_colors.concat(adapted_colors);
                } else {
                    for (var m = 1; m < mark_amt_affix; m += 1) {
                        item_colors.push(addHashToHex(img_colors[m]));
                    }
                }

                if (settings.apply_colors) {
                    $elem.css('background-color', addHashToHex(background));

                    for (var i = 0; i < marks.length; i += 1) {
                        marks[i].css('color', item_colors[i + 1]);

                        for (var l = 0; l < marks[i].length; l += 1) {
                            var node_name = marks[i][l].nodeName.toLowerCase();

                            if (settings.rules.hasOwnProperty(node_name)) {
                                var rules = settings.rules[node_name].split(',');

                                for (var k = 0; k < rules.length; k += 1) {
                                    marks[i][l].style[rules[k].replace(/\s/g, '')] = item_colors[i + 1];
                                }
                            }
                        }
                    }
                }

                if (settings.insert_colors) {
                    var $colors_container = $elem.find(_s.sel.chmln_colors);

                    if ($colors_container.length) {
                        $colors_container.html('');
                    } else {
                        $colors_container = $('<div class="' + clearSel(_s.sel.chmln_colors) + '">');
                        $elem.append($colors_container);
                    }

                    $.each(img_colors, function (index, item) {
                        if (index === 0) {
                            $colors_container.append(getColorElem({color: background}));
                        } else {
                            if (item_colors[index]) {
                                $colors_container.append(getColorElem({color: item_colors[index], source_color: item}));
                            } else if (settings.all_colors) {
                                $colors_container.append(getColorElem({color: item}));
                            }
                        }
                    });
                }

                if (settings.all_colors) {
                    var rest_img_colors = img_colors.slice(item_colors.length).map(addHashToHex);

                    item_colors = item_colors.concat(rest_img_colors);
                }

                if (settings.data_colors) {
                    setElemAttributes($elem, {'data-colors': item_colors});
                }

                $elem.addClass(clearSel(_s.sel.chmln_colorize_done));
            }

            return item_colors;
        },
        actions = {
            colorizeContent: function($elements, options) {
                var settings = extendSettings(getDefaultSettings(), options),
                    colorize = function () {
                        var $this = $(this),
                            item_settings = extendSettings(settings, { $img: $this.find(_s.sel.chmln_img).first() });

                        if (item_settings.$img.length) {
                            parseImageColors($this, item_settings.$img[0].src, item_settings,
                                function(img_colors, $container, settings) {
                                    var item_colors = colorizeElem($container, img_colors, settings);

                                    if (typeof item_settings.afterColorized === 'function') {
                                        item_settings.afterColorized(item_colors, settings);
                                    }
                                },
                                function(img_src, $container, settings) {
                                    if (typeof item_settings.afterColorized === 'function') {
                                        item_settings.afterColorized([], settings);
                                    }

                                    logger('Failed to load image with url "' + img_src + '".', 'error');
                                }
                            );
                        } else {
                            logger('Image not found. Each individual material must contain at least one image.', 'error');
                        }
                    };

                if (!$elements.length) {
                    logger('Nothing found, probably, bad selector.', 'warn');
                }

                $elements
                    .removeClass(clearSel(_s.sel.chmln_colorize_done))
                    .toggleClass(clearSel(_s.sel.chmln_async_colorize), !!settings.async_colorize);

                if (settings.async_colorize) {
                    var getNext = function($items) {
                            var next = false;

                            if ($items.length) {
                                next = $items.splice(0, 1)[0];
                            }

                            return $(next);
                        },
                        asyncColorize = function($elem) {
                            if ($elem && $elem.length) {
                                if (isUndefined(getStopColorize($elem))) {
                                    colorize.call($elem);
                                    $elem = getNext($elements);

                                    if ($elem.length) {
                                        setTimeout(asyncColorize.bind(null, $elem), 0);
                                    } else {
                                        if (typeof settings.afterAsyncColorized === 'function') {
                                            settings.afterAsyncColorized();
                                        }
                                    }
                                } else {
                                    getStopColorize($elem, '', true);
                                }
                            }
                        };

                    if (typeof settings.beforeAsyncColorized === 'function') {
                        settings.beforeAsyncColorized();
                    }

                    asyncColorize(getNext($elements));
                } else {
                    $elements.each(colorize);
                }
            },
            getImageColors: function($elements, options) {
                var handleElement = function() {
                    var $img = $(this),
                        settings = extendSettings(getDefaultSettings({
                            settings_type: 'getImageColors',
                            settings_values: {$img: $img}
                        }), options);

                    if ($img[0].nodeName.toLowerCase() === 'img') {
                        parseImageColors($img.parent(), $img.attr('src'), settings, settings.onGetColorsSuccess, settings.onGetColorsError);
                    } else {
                        logger('Given element is not "img"!', 'error');
                    }
                };

                $elements.each(handleElement);
            },
            stopColorize: function($elements) {
                var $not_done_elements = $elements.filter(':not(' + _s.sel.chmln_colorize_done + ')');

                if ($not_done_elements.length) {
                    getStopColorize($not_done_elements, 1);
                }
            },
            get_s: {
                result: function() {
                    return _s;
                }
            },
            getDefaultSettings: {
                result: function(options) {
                    return getDefaultSettings(options);
                }
            },
            getColorElem: {
                result: function(options) {
                    return getColorElem(options);
                }
            },
            colorObjectFromHex: {
                result: function(options) {
                    return colorObjectFromHex(options.hex);
                }
            },
            sortColors: {
                result: function(options) {
                    return sortImageColors(options);
                }
            }
        };

    $.fn.chameleon = function (action, options) {
        var $elements = $(this),
            action_passed = typeof action === 'string',
            validation = validateSettings(action_passed ? options : action);

        options = validation.fixed_settings;

        if (validation.invalid.length) {
            logger(['Bad settings are fixed!', validation.invalid], 'warn');
        }

        if (action_passed) {
            if (actions.hasOwnProperty(action)) {
                if (actions[action].result && typeof actions[action].result === 'function') {
                    return actions[action].result(options);
                }

                actions[action]($elements, options);
            } else {
                logger(['Unknown action!', action], 'error');
            }
        } else {
            actions.colorizeContent($elements, options);
        }

        return this;
    };
})(jQuery, window);