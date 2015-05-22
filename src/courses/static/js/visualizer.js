/*

Online Python Tutor
https://github.com/pgbovine/OnlinePythonTutor/

Copyright (C) 2010-2012 Philip J. Guo (philip@pgbovine.net)

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

/*
 * Refactoring and modernization by the Pythontutor-ru team
 * https://github.com/vpavlenko/pythontutor-ru, 2014
 */

function Visualizer(block, init_code, init_stdin, passed_options) {
	if(this == window) { // if the call were not in a new context (eg. visualizer = Visualizer(...))
		return new Visualizer(block, init_code, init_stdin, options); // <- this is the right variant
	}


	if(init_code === undefined) {
		init_code = $(block).text().trim();
		if(init_code != '') {
			init_code += '\n';
		}
	}

	if(init_stdin === undefined) {
		init_stdin = '';
	}

	if(options === undefined) {
		options = {};
	}


	// Options. Configurable by the "passed_options" argument
	var options = {
		explain_mode: true, // should the explain mode be enabled by default?
		explain_mode_switch: true, // should user have ability to enable/disable the explain mode?

		dataviz_enabled: true, // should dataviz be visible?

		stack_grows_down: true, // stack grows down?
		stack_grows_down_switch: true, // stack grows down... or up... user-configurable?

		code_read_only: false, // should user have ability to change code?
		stdin_read_only: false, // should user have ability to change stdin?

		show_stdin: true, // should I show stdin input?
		show_stdin_initially: true, // should I show stdin input initially?

		executable: true, // may the code be executed?

		auto_height: false, // automatically set the code editor height (one-shot - only when created!)

		code_font_size: 14,
		stdin_font_size: 14,
		stdout_font_size: 14
	};

	$.extend(options, passed_options);

	if(!options.executable) {
		options.explain_mode = false;
		options.explain_mode_switch = false;
		options.code_read_only = true;
		options.stdin_read_only = true;
		options.show_stdin = false;
	}


	block = $(block);


	/* colors - see edu-python.css */
	var lightGray = "#cccccc";
	var darkBlue = "#3D58A2";
	var lightBlue = "#899CD1";
	var pinkish = "#F15149";
	var darkRed = "#9D1E18";


	var MAX_AUTO_HEIGHT = 350;


	var editors = {}; // code, stdin, stdout
	var vcr = {}; // step-by-step execution control buttons
	var blocks = {}; // code, stdin, stdout, vcr, data_viz, error
	var buttons = {}; // run

	blocks.main = $(block); // main block, all will be within this one

	var trace = undefined;
	var current = {}; // line, instruction, is_error, ...
	var current_code = undefined; // currently debugging code (needed for the code changed indicator)

	var code_changed = false; // code, which is debugging right now
	var is_executing = false;
	var has_ever_runned = false; // whether the code has ever lauched?

	var custom_status = ''; // override status bar text


	var event_subscribers = { // "this" in the callbacks is a visualizer object
		'change_code': [], // arguments: -
		'change_stdin': [], // arguments: -

		'before_run': [], // arguments: run_mode ('expain' or 'simple'); return false to cancel
		'after_run': [] // arguments: status (from server - 'ok', 'time_limited', 'empty', 'unhandled_exception', 'stderr', ... or false if request error ocurred), stdout
	};


	var viss = this; // this is needed for the access from some functions

	var mblock = blocks.main;


	var plumb = jsPlumb.getInstance();


	///// Helpers /////

	function assert(cond) {
		if(!cond) {
			alert('Error: ASSERTION FAILED');
		}
	}

	function replaceClass(elem, class1, class2) {
		elem.removeClass(class1).addClass(class2);
	}

	function toggleFullRow(elem, full_row, w1, w2) {
		var width1 = (full_row ? w1 : w2);
		var width2 = (full_row ? w2 : w1);
		replaceClass(elem, 'col-xs-' + width1, 'col-xs-' + width2);
	}


	///// UI setup /////

	function _setupUI() {
		mblock.addClass('visualizer');
		mblock.html(
			// code and data visualizer
			'<div class="row">\n' +
				'<div class="col-xs-9">\n' +
					'<div class="visualizer_code">\n' +
						'<div class="visualizer_code_toppanel">\n' +
							'<span class="visualizer_status">\n' +
								'<span class="visualizer_status_code_changed">[*] </span>\n' +
								'<span class="visualizer_status_text"></span>\n' +
							'</span>\n' +
							'<label class="visualizer_explain_mode">выполнить пошагово <input type="checkbox" checked></label>\n' +
							'<button class="visualizer_run_btn">запустить <span class="glyphicon glyphicon-play"></span></button>\n' +
						'</div>\n' +

						'<pre class="visualizer_prog_code"></pre>\n' +

						'<div class="visualizer_code_bottompanel visualizer_vcr">\n' +
							'<span class="visualizer_vcr_left">\n' +
								'<button class="visualizer_vcr_to_begin"><span class="glyphicon glyphicon-arrow-left"></span> к началу</button>\n' +
							'</span>\n' +
							'<button class="visualizer_vcr_back"><span class="glyphicon glyphicon-chevron-left"></span> назад</button>\n' +
							'<button class="visualizer_vcr_next">дальше <span class="glyphicon glyphicon-chevron-right"></span></button>\n' +
							'<span class="visualizer_vcr_right">\n' +
								'<button class="visualizer_vcr_to_end">к концу <span class="glyphicon glyphicon-arrow-right"></span></button>\n' +
							'</span>\n' +
						'</div>\n' +
					'</div>\n' +

					'<div class="row">\n' +
						'<div class="col-xs-6">\n' +
							'Входные данные:' +
							'<pre class="visualizer_prog_stdin"></pre>\n' +
						'</div>\n' +

						'<div class="col-xs-6">\n' +
							'Выходные данные:' +
							'<pre class="visualizer_prog_stdout"></pre>\n' +
						'</div>\n' +
					'</div>\n' +
				'</div>\n' +

				'<div class="col-xs-3">\n' +
					'<div class="visualizer_error panel panel-danger">\n' +
					    '<div class="panel-heading">\n' +
							'<h3 class="panel-title">Возникло исключение</h3>\n' +
						'</div>\n' +
						'<div class="panel-body visualizer_error_raw"></div>\n' +
					'</div>\n' +

					'<div class="col-xs-6">\n' +
						'<div class="visualizer_dataviz">\n' +
							'<div class="visualizer_dataviz_header">\n' +
								'Стек растет\n' +
								'<select class="visualizer_dataviz_stack_growth_selector">\n' +
									'<option value="down">вниз</option>\n' +
									'<option value="up">вверх</option>\n' +
								'</select>\n' +
							'</div>\n' +

							'<div class="visualizer_dataviz_body"></div>\n' + // this will be rendered by _updateDataViz
						'</div>\n' +
					'</div>\n' +
				'</div>\n' +
			'</div>\n' +

			// stdin and stdout
			'<div class="row">\n' +
			'</div>\n' +
		'');


		blocks.code = mblock.find('.visualizer_prog_code');
		blocks.stdin = mblock.find('.visualizer_prog_stdin');
		blocks.stdout = mblock.find('.visualizer_prog_stdout');

		blocks.error = mblock.find('.visualizer_error');
		blocks.error_rate_question = mblock.find('.visualizer_error_rate_question');
		blocks.error_rate_thank = mblock.find('.visualizer_error_rate_thank');

		blocks.vcr = mblock.find('.visualizer_vcr');
		blocks.dataviz = mblock.find('.visualizer_dataviz');

		blocks.status = mblock.find('.visualizer_status');
		blocks.status.code_changed = blocks.status.find('.visualizer_status_code_changed');
		blocks.status.status_text = blocks.status.find('.visualizer_status_text');

		buttons.run = mblock.find('.visualizer_run_btn');
		buttons.explain_mode = mblock.find('.visualizer_explain_mode > input');

		vcr.to_begin = blocks.vcr.find('.visualizer_vcr_to_begin');
		vcr.to_end = blocks.vcr.find('.visualizer_vcr_to_end');
		vcr.back = blocks.vcr.find('.visualizer_vcr_back');
		vcr.next = blocks.vcr.find('.visualizer_vcr_next');


		_setupEditors();
		_setupButtons();
		_setupVCR();
		_setupUImisc();

		updateUI();
	}

	function _setupEditors() {
		blocks.code.text(init_code);
		blocks.stdin.text(init_stdin);


		editors.code = ace.edit(blocks.code[0]);
		editors.stdin = ace.edit(blocks.stdin[0]);
		editors.stdout = ace.edit(blocks.stdout[0]);


		editors.code.setOptions({
			fontSize: options.code_font_size,
			mode: 'ace/mode/python',
			vScrollBarAlwaysVisible: true
		});

		var progData_editor_options = {
			behavioursEnabled: false,
			cursorStyle: 'slim',
			displayIndentGuides: false,
			fixedWidthGutter: true,
			highlightActiveLine: false,
			highlightGutterLine: false,
			mode: 'ace/mode/text',
			showPrintMargin: false,
			useSoftTabs: false
		};

		editors.stdin.setOptions(progData_editor_options);
		editors.stdout.setOptions(progData_editor_options);

		editors.stdout.setReadOnly(true);
		editors.stdin.setFontSize(options.stdin_font_size);
		editors.stdout.setFontSize(options.stdout_font_size);


		editors.code.on('change', function(e) {
			code_changed = (current_code !== undefined && editors.code.getValue().trim() != current_code.trim());
			updateStatus();

			if(options.auto_height && e.data.action == 'insertText' &&
									  e.data.text.indexOf('\n') > 0) {
				autoHeight();
			}

			fireEvent('change_code');
		});

		editors.stdin.on('change', function(e) {
			fireEvent('change_stdin');
		});
	}

	function _setupButtons() {
		buttons.run.click(function() { run(); });
		buttons.explain_mode.click(function() {
			options.explain_mode = this.checked;

			if(has_ever_runned) {
				if(!options.explain_mode && trace !== undefined) {
					// trace present, but explain mode should be disabled. jump to the end to simulate non-expain mode.
					jumpToEnd();

					current.line = undefined;
					_updateHighlight();

				} else if(options.explain_mode && trace === undefined) {
					// trace undefined, but explain mode should be enabled. rerun code to get the trace.
					run();
				}
			}
		});
		buttons.explain_mode.attr('checked', options.explain_mode);
		buttons.explain_mode.toggle(options.stack_grows_down_switch);
	}

	function _setupVCR() {
		vcr.to_begin.click(function() { jumpToBegin(); });
		vcr.to_end.click(function() { jumpToEnd(); });

		vcr.back.click(function() { prevInstruction(); });
		vcr.next.click(function() { nextInstruction(); });
	}

	function _setupUImisc() {
		mblock.find('.visualizer_code_toppanel').toggle(options.executable);

		buttons.explain_mode.parent().toggle(options.explain_mode_switch);


		blocks.dataviz.find('.visualizer_dataviz_stack_growth_selector').change(function() {
			options.stack_grows_down = ($(this).val() == 'down');
			updateUI();
		});


		plumb.setContainer(blocks.dataviz);

		$(window).resize(function() {
			plumb.repaintEverything();
		});

		_hide_rate_question();
		blocks.error_rate_question.find('button').click(function() {
			_record_rate_choice($(this).attr('data-helped') == 'true');
		});
	}


	///// UI management /////

	function focusCodeEditor() {
		editors.code.focus();
	}

	function clear() { // clears all - but don't clear code, stdin
		editors.stdout.setValue('');

		trace = undefined;
		_clearCurrent();

		custom_status = '';

		updateUI();
	}

	function reset() { // restores everything (exclude code and stdin) to it's initially state
		has_ever_runned = false;
		current_code = undefined;
		code_changed = false;
		clear();
	}

	function autoHeight(editor) {
		if(editor !== undefined) {
			var lines = editor.getSession().getScreenLength();
			var line_height = editor.renderer.layerConfig.lineHeight;
			var height = Math.min(MAX_AUTO_HEIGHT, line_height * lines);

			$(editor.renderer.getContainerElement()).height(height);
			editor.resize();

		} else {
			autoHeight(editors.code);
		}
	}

	function setStatus(status) {
		custom_status = status;
		updateStatus();
	}


	///// Explain management /////

	function _processTrace() {
		if(trace.length > 0) {
			var last_entry = trace[trace.length - 1];

			if(last_entry.event == 'instruction_limit_reached') {
				trace.pop(); // kill last entry

				blocks.error.text('Превышен лимит действий программы. Возможно, в ней есть бесконечный цикл...');
				blocks.error.show();

			} else if(trace.length == 2) {
				// as imran suggests, for a (non-error) one-liner, SNIP off the
				// first instruction so that we start after the FIRST instruction
				// has been executed ...
				trace.shift();
			}
		}
	}

	function jumpToBegin() {
		return trace !== undefined && setInstruction(0);
	}

	function jumpToEnd() {
		// if there's an exception, then jump to the FIRST occurrence of
		// that exception.  otherwise, jump to the very end of execution.

		var instruction = trace.length - 1;

		for(var i = 0; i < trace.length; i++) {
			var entry = trace[i];
			if(entry.event == 'exception' || entry.event == 'uncaught_exception') {
				instruction = i;
				break;
			}
		}

		setInstruction(instruction);
	}

	function _clearCurrent() {
		current = {};
	}

	function setInstruction(instruction) {
		if(code_changed) {
			if(confirm('Код был изменён. Для продолжения отладки его нужно выполнить снова. Сделать это сейчас?')) {
				run();
				return;
			}
		}


		if(trace === undefined || instruction >= trace.length || instruction < 0)
			return false; // not possible - this instruction is undefined or trace is empty


		_clearCurrent();

		current.instruction = instruction;
		current.is_first = (instruction == 0);
		current.is_last = (instruction == trace.length - 1);

		var trace_entry = current._trace_entry = trace[instruction];

		current.line = trace_entry.line - 1;
		current.event = trace_entry.event;

		current.is_error = (trace_entry.event == 'exception' || trace_entry.event == 'uncaught_exception');
		if(current.is_error) {
			current.error_msg = trace_entry.exception_msg;
			current.error_translation = trace_entry.exception_translation;
			current.error_type = trace_entry.exception_type;
		}

		current.stdout = trace_entry.stdout;
		current.stderr = trace_entry.stderr;

		current.func_name = trace_entry.func_name;
		current.globals = trace_entry.globals;
		current.stack_locals = trace_entry.stack_locals;

		updateUI();
	}

	function nextInstruction() {
		return trace !== undefined && setInstruction(current.instruction + 1);
	}

	function prevInstruction() {
		return trace !== undefined && setInstruction(current.instruction - 1);
	}


	///// UI update /////

	function updateUI() {
		_updateHighlight();
		_updateError();
		_updateOutput();
		_updateScroll();

		updateStatus();

		if(options.explain_mode && trace !== undefined) {
			_updateVCR();
			_updateDataViz();
		}

		_updateUImisc();
	}

	function _clearMarkers(edit_session) {
		$.each(edit_session.getMarkers(), function(id, marker) {
			if(marker.clazz.indexOf('visualizer_') == 0) {
				edit_session.removeMarker(id);
			}
		});
	}

	function _updateHighlight() {
		// calculate all lines that have been 'visited' 
		// by execution up to (but NOT INCLUDING) curInstr:
		var lines_visited = {};
		for(var i = 0; i < current.instruction; i++) {
			lines_visited[trace[i].line - 1] = true;
		}


		var edit_session = editors.code.getSession();

		edit_session.clearBreakpoints();
		_clearMarkers(edit_session);

		var Range = ace.require('ace/range').Range;

		for(var line = 0; line < edit_session.getLength(); line++) {
			if(line == current.line) {
				if(current.is_error) {
					edit_session.setBreakpoint(line, 'visualizer_lineGutter_error');
					edit_session.addMarker(new Range(line, 0, line, Infinity), 'visualizer_lineMarker_error', 'screenLine');
				} else {
					edit_session.setBreakpoint(line, 'visualizer_lineGutter_current');
					edit_session.addMarker(new Range(line, 0, line, Infinity), 'visualizer_lineMarker_current', 'screenLine');
				}
			} else {
				if(lines_visited[line]) {
					edit_session.setBreakpoint(line, 'visualizer_lineGutter_visited');
				}
			}
		}

		editors.code.renderer.updateBackMarkers(true);
	}

	function _updateVCR() {
		vcr.back.attr('disabled', current.is_first);
		vcr.next.attr('disabled', current.is_last);

		vcr.to_begin.attr('disabled', current.is_first);
		vcr.to_end.attr('disabled', current.is_last);
	}

	function _updateError() {
		if(current.is_error) {
			var error_msg = 'Неизвестная ошибка';

			if(current.error_msg) {
				error_msg = (current.error_type ? current.error_type : 'Ошибка') + ' на строке ' + (current.line + 1) + ': ' + current.error_msg;
			} else {
				error_msg = 'Неизвестная ошибка';
			}

			blocks.error.find('.visualizer_error_raw').text(error_msg);
			blocks.error.find('.visualizer_error_translation').toggle(current.error_translation != null).html(current.error_translation || '');
			blocks.error.show();

			if (current.error_translation != null) {
				_init_rate_question(error_msg, current.error_translation, viss.code, viss.stdin);
			}
		} else {
			blocks.error.hide();
			_hide_rate_question();
		}
	}

	function _updateOutput() {
		editors.stdout.setValue(current.stdout);
		editors.stdout.selection.clearSelection(); // Ace editor selects text, if it was changed. In our case, it looks not very good...
	}

	function _updateScroll() {
		if(current.line <= editors.code.renderer.getFirstFullyVisibleRow() ||
		   current.line >= editors.code.renderer.getLastFullyVisibleRow() - 1) {

			var size = editors.code.renderer.getLastFullyVisibleRow()
					 - editors.code.renderer.getFirstFullyVisibleRow();

			var scroll_to_line = current.line;
			if(current.line >= editors.code.getLastVisibleRow() - 1) {
				scroll_to_line = current.line - size + 1;
			}

			editors.code.scrollToLine(scroll_to_line);
		}
		editors.stdout.scrollToLine(editors.stdout.getSession().getLength());
	}

	function updateStatus() {
		blocks.status.code_changed.toggle(code_changed);

		blocks.status.status_text.text('');

		if(is_executing) {
			blocks.status.status_text.text('Пожалуйста, подождите...');
		} else {
			if(options.explain_mode && trace !== undefined) {
				if(current.is_last) {
					blocks.status.status_text.text('Завершено');
				} else {
					blocks.status.status_text.text(
						'Шаг ' + (current.instruction + 1) + ' из ' + (trace.length - 1) +
						(current.func_name != '<module>' ? ', функция ' + current.func_name : '')
					);
				}
			}

			if(current.is_error) {
				blocks.status.status_text.text('Ошибка на строке ' + (current.line + 1));
			}
		}

		if(custom_status) {
			blocks.status.status_text.text(custom_status);
		}
	}

	function _updateUImisc() {
		// stdout is not needed if code was never lauched
		blocks.stdout.parent().toggle(has_ever_runned);

		// "smart" stdin visibility
		if(!options.show_stdin || (!options.show_stdin_initially && !has_ever_runned)) {
			blocks.stdin.parent().hide();
		} else {
			blocks.stdin.parent().toggle(!(options.stdin_read_only || options.code_read_only) || stdin != '' || !options.show_stdin);
		}

		// why do we need dataviz if explain_mode is not enabled? or code was never launched? or data is unavailable?
		blocks.dataviz.toggle(options.dataviz_enabled && options.explain_mode && has_ever_runned && trace !== undefined);
		blocks.dataviz.find('.visualizer_dataviz_header').toggle(!$.isEmptyObject(current.stack_locals));
		plumb.repaintEverything(); // with all these 123 we could spoil the position of endpoints, so redraw

		// stdin should be full-row if stdout is not visible, and half-row otherwise
		toggleFullRow(blocks.stdin.parent(), !blocks.stdout.parent().is(':visible'), 6, 12);
		// stdout - if stdin is not visible
		toggleFullRow(blocks.stdout.parent(), !blocks.stdin.parent().is(':visible'), 6, 12);
		// code - if dataviz and error is not visible
		toggleFullRow(blocks.code.parent().parent(), !(blocks.dataviz.is(':visible') || blocks.error.is(':visible') || has_ever_runned), 9, 12);

		// similarly
		blocks.vcr.toggle(options.explain_mode && has_ever_runned);

		// editors sometimes not rendered if created invisible
		// (it is possible that it is a bug in the Ace editor)
		// this is a workaround
		editors.stdin.renderer.updateText();
		editors.stdout.renderer.updateText();


		editors.stdin.setReadOnly(options.stdin_read_only);
		editors.code.setReadOnly(options.code_read_only);
	}

	// The "2.0" version of renderDataStructures, which renders variables in
	// a stack and values in a separate heap, with data structure aliasing
	// explicitly represented via line connectors (thanks to jsPlumb lib).
	//
	// This version was originally created in September 2011
	function _updateDataViz() {
		if(!options.dataviz_enabled)
			return;


		var dataviz = blocks.dataviz.find('.visualizer_dataviz_body');


		// VERY VERY IMPORTANT --- and reset ALL jsPlumb state to prevent
		// weird mis-behavior!!!
		plumb.reset();


		dataviz.html(
			// create a tabular layout for stack and heap side-by-side
			// TODO: figure out how to do this using CSS in a robust way!
			'<table class="visualizer_dataviz_stackHeapTable">\n' +
				'<tr>\n' +
					'<td>\n' +
						'<div class="visualizer_dataviz_stack">\n' +
							'<div class="visualizer_dataviz_stack_body">\n' +
						'</div>\n' +
					'</td>\n' +
					'<td>\n' +
						'<div class="visualizer_dataviz_heap"></div>\n' +
					'</td>\n' +
				'</tr>\n' +
			'</table>\n' +
		'');


		var any_globals_present = false;
		var globals_present = {};
		if(current.globals !== undefined) {
			// use plain ole' iteration rather than jQuery $.each() since
			// the latter breaks when a variable is named "length"
			for(varname in current.globals) {
				globals_present[varname] = true;
				any_globals_present = true;
			}
		}

		// render all global variables IN THE ORDER they were created by the program,
		// in order to ensure continuity:
		var globals_sorted = []

		if(any_globals_present) {
			// iterating over ALL instructions up to the current
			// (could be SLOW if not for our optimization below)
			//
			// TODO: this loop still seems like it can be optimized further if necessary
			for(var i = 0; i <= current.instruction; i++) {
				// some entries (like for exceptions) don't have GLOBALS
				if(trace[i].globals == undefined) continue;

				// use plain ole' iteration rather than jQuery $.each() since
				// the latter breaks when a variable is named "length"
				for(varname in trace[i].globals) {
					// eliminate duplicates (act as an ordered set)
					if($.inArray(varname, globals_sorted) == -1) {
						globals_sorted.push(varname);
						globals_present[varname] = undefined; // 'unset it'
					}
				}

				var early_stop = true;
				// as an optimization, STOP as soon as you've found everything in globals_present:
				for(o in globals_present) {
					if(globals_present[o] != undefined) {
						early_stop = false;
						break;
					}
				}

				if(early_stop) {
					break;
				}
			}
		}


		var variable_blocks = {};
		var heap_connections = {};


		function addStackFrameVar(table, varname, val, show_name) {
			// (use '!==' to do an EXACT match against undefined)
			if(val !== undefined) { // might not be defined at this line, which is OKAY!
				var row = $('<tr><td class="visualizer_dataviz_stack_frame_var"></td><td class="visualizer_dataviz_stack_frame_value"></td></tr>');

				if(show_name)
					row.find('.visualizer_dataviz_stack_frame_var').html(show_name);
				else
					row.find('.visualizer_dataviz_stack_frame_var').text(varname);

				table.append(row);

				// render primitives inline
				if(isPrimitiveType(val)) {
					renderData(val, row.find('td')[1], false);
				} else {
					// add a stub so that we can connect it with a connector later.
					// IE needs this div to be NON-EMPTY in order to properly
					// render jsPlumb endpoints, so that's why we add an "&nbsp;"!

					var i = 0;
					while(heap_connections[varname + i] !== undefined) {
						i++;
					}
					variable_blocks[varname + i] = row;
					heap_connections[varname + i] = getObjectID(val);
				}

				return row;
			}
		}

		function createStackFrame(name, clacss) {
			var block = $(
				'<div class="visualizer_dataviz_stack_frame ' + clacss + '">\n' +
					'<div class="visualizer_dataviz_stack_frame_header visualizer_dataviz_stack_frame_header_inactive"></div>\n' +
				'</div>' +
			'');
			block.find('.visualizer_dataviz_stack_frame_header').addClass(clacss).text(name);
			dataviz.find('.visualizer_dataviz_stack_body').append(block);

			return block;
		}

		function createTableInStackFrame(frame_block) {
			var table = $('<table class="visualizer_dataviz_stack_frame_var_table"></table>');
			frame_block.append(table);
			return table;
		}


		// nested helper functions are helpful!
		function renderGlobals() {
			// render global variables:
			if(globals_sorted.length > 0) {
				var table = createTableInStackFrame(createStackFrame('Глобальные переменные', 'visualizer_dataviz_global_stack_frame'));
				// iterate IN ORDER (it's possible that not all vars are in current.globals)
				$.each(globals_sorted, function(i, varname) {
					addStackFrameVar(table, varname, current.globals[varname]);
				});
			}
		}


		function renderStackFrame(frame) {
			var func_name = frame[0];
			var locals = frame[1];

			var frame_block = createStackFrame(func_name, ((i == 0) ? 'visualizer_dataviz_top_stack_frame' : ''));

			// render locals in alphabetical order for tidiness:
			// TODO: later on, render locals in order of first appearance, for consistency!!!
			// (the back-end can actually pre-compute this list so that the
			// front-end doesn't have to do any extra work!)
			var locals_sorted = Object.keys(locals);
			locals_sorted.sort();

			if(locals_sorted.length > 0) {
				var table = createTableInStackFrame(frame_block);

				// put return value at the VERY END (if it exists)
				var retval_idx = $.inArray('__return__', locals_sorted); // more robust than indexOf()
				if(retval_idx > -1) {
					locals_sorted.splice(retval_idx, 1);
					locals_sorted.push('__return__');
				}

				$.each(locals_sorted, function(i, varname) {
					var val = locals[varname];

					// special treatment for displaying return value and indicating
					// that the function is about to return to its caller
					if(varname == '__return__') {
						assert(current.event == 'return'); // sanity check
						table.append('<tr><td colspan="2" class="visualizer_dataviz_return_warning">Функция собирается завершиться</td></tr>');
						addStackFrameVar(table, varname, locals[varname], '<span class="visualizer_dataviz_retval">Возвращаемое значение:</span>');
					} else {
						addStackFrameVar(table, varname, locals[varname]);
					}
				});
			}
		}

		// first render the stack (and global vars)

		if(options.stack_grows_down) {
			renderGlobals();
			if(current.stack_locals) {
				for(var i = current.stack_locals.length - 1; i >= 0; i--) {
					var frame = current.stack_locals[i];
					renderStackFrame(frame);
				}
			}
		} else {
			if(current.stack_locals) {
				for(var i = 0; i < current.stack_locals.length; i++) {
					var frame = current.stack_locals[i];
					renderStackFrame(frame);
				}
			}
			renderGlobals();
		}


		// then render the heap
		var heap_block = dataviz.find('.visualizer_dataviz_heap');

		rendered_heap_objs = {}; // set of object IDs that have already been rendered

		// if addToEnd is true, then APPEND to the end of the heap,
		// otherwise PREPEND to the front
		function renderHeapObject(obj, add_to_end) {
			var obj_ID = getObjectID(obj);

			if(rendered_heap_objs[obj_ID] === undefined) {
				var obj_block = $('<div class="visualizer_dataviz_heap_object"></div>');

				if(add_to_end) {
					heap_block.append(obj_block);
				} else {
					heap_block.prepend(obj_block);
				}
				renderData(obj, obj_block, false);

				rendered_heap_objs[obj_ID] = obj_block;
			}
		}


		// if there are multiple aliases to the same object, we want to render
		// the one deepest in the stack, so that we can hopefully prevent
		// objects from jumping around as functions are called and returned.
		// e.g., if a list L appears as a global variable and as a local in a
		// function, we want to render L when rendering the global frame.

		if(options.stack_grows_down) {
			// this is straightforward: just go through globals first and then
			// each stack frame in order :)

			if(current.globals) {
				$.each(globals_sorted, function(i, varname) {
					var val = current.globals[varname];
					// primitive types are already rendered in the stack
					if(!isPrimitiveType(val)) {
						renderHeapObject(val, true); // APPEND
					}
				});
			}

			if(current.stack_locals) {
				$.each(current.stack_locals, function(i, frame) {
					var locals = frame[1];

					var locals_sorted = Object.keys(locals);
					locals_sorted.sort();

					$.each(locals_sorted, function(j, varname) {
						var val = locals[varname];

						// primitive types are already rendered in the stack
						if(!isPrimitiveType(val)) {
							renderHeapObject(val, true); // APPEND
						}
					});
				});
			}

		} else {
			// to accomplish this goal, go BACKWARDS starting at globals and
			// crawl up the stack, PREPENDING elements to the front of #heap

			if(current.globals) {
				for(var i = globals_sorted.length - 1; i >= 0; i--) {
					var varname = globals_sorted[i];
					var val = current.globals[varname];

					// primitive types are already rendered in the stack
					if(!isPrimitiveType(val)) {
						renderHeapObject(val, false); // PREPEND
					}
				}
			}

			if(current.stack_locals) {
				// go BACKWARDS
				for(var i = current.stack_locals.length - 1; i >= 0; i--) {
					var frame = current.stack_locals[i];
					var locals = frame[1];

					var locals_sorted = Object.keys(locals);
					locals_sorted.sort();
					locals_sorted.reverse(); // so that we can iterate backwards

					$.each(locals_sorted, function(i, varname) {
						var val = locals[varname];

						// primitive types are already rendered in the stack
						if(!isPrimitiveType(val)) {
							renderHeapObject(val, false); // PREPEND
						}
					});
				}
			}
		}


		// finally connect stack variables to heap objects via connectors
		for(varname in heap_connections) {
			plumb.connect({
				source: variable_blocks[varname],
				target: rendered_heap_objs[heap_connections[varname]],

				anchors: ['RightMiddle', 'LeftMiddle'],

				connector: ['Bezier', {curviness: 15}], // too much 'curviness' causes lines to run together
				overlays: [
					['Arrow', {length: 14, width: 10, foldback: 0.55, location: 0.35}]
				],

				endpoint: ['Dot', {radius: 3}],
				endpointStyle: {fillStyle: lightGray},
				endpointHoverStyle: {fillStyle: pinkish},

				paintStyle: {lineWidth: 1, strokeStyle: lightGray},
				hoverPaintStyle: {lineWidth: 2, strokeStyle: pinkish}
			});
		}


		// add an on-click listener to all stack frame headers
		dataviz.find('.visualizer_dataviz_stack_frame_header').click(function() {
			var encl_stack_frame = $(this).parent();

			var allConnections = plumb.getConnections();
			for(var i = 0; i < allConnections.length; i++) {
				var c = allConnections[i];

				var stack_frame = $(c.source).parent().parent().parent();

				// if this connector starts in the selected stack frame ...
				if(stack_frame[0] == encl_stack_frame[0]) {
					// then HIGHLIGHT IT!
					c.setPaintStyle({lineWidth:2, strokeStyle: darkBlue});
					c.endpoints[0].setPaintStyle({fillStyle: darkBlue});
					c.endpoints[1].setVisible(false, true, true); // JUST set right endpoint to be invisible

					// ... and move it to the VERY FRONT
					$(c.canvas).css('z-index', 1000);
				} else {
					// else unhighlight it
					c.setPaintStyle({lineWidth:1, strokeStyle: lightGray});
					c.endpoints[0].setPaintStyle({fillStyle: lightGray});
					c.endpoints[1].setVisible(false, true, true); // JUST set right endpoint to be invisible
					$(c.canvas).css('z-index', 0);
				}
			}

			// clear everything, then just activate $(this) one ...
			dataviz.find('.visualizer_dataviz_stack_frame').removeClass('visualizer_dataviz_stack_frame_selected');
			dataviz.find('.visualizer_dataviz_stack_frame_header').addClass('visualizer_dataviz_stack_frame_header_active');

			encl_stack_frame.addClass('visualizer_dataviz_stack_frame_selected');
			$(this).removeClass('visualizer_dataviz_stack_frame_header_active');
		});


		// 'click' on the top-most stack frame if available,
		// or on "Global variables" otherwise
		if(current.stack_locals !== undefined && current.stack_locals.length > 0) {
			dataviz.find('.visualizer_dataviz_top_stack_frame').trigger('click');
		} else {
			dataviz.find('.visualizer_dataviz_global_stack_frame').trigger('click');
		}


		function isPrimitiveType(obj) {
			var typ = typeof(obj);
			return ((obj == null) || (typ != 'object'));
		}

		function getObjectID(obj) {
			// pre-condition
			assert(!isPrimitiveType(obj));
			assert($.isArray(obj));

			if((obj[0] == 'INSTANCE') || (obj[0] == 'CLASS')) {
				return obj[2];
			} else {
				return obj[1];
			}
		}


		// render the JS data object obj inside of elem,
		// which is a jQuery wrapped DOM object
		function renderData(obj, elem) {
			elem = $(elem);

			// dispatch on types:
			var typ = typeof(obj);

			if(obj == null) {
				elem.append('<span class="visualizer_dataviz_obj_null">None</span>');

			} else if(typ == 'number') {
				elem.append('<span class="visualizer_dataviz_obj_number">' + obj + '</span>');

			} else if(typ == 'boolean') {
				if(obj) {
					elem.append('<span class="visualizer_dataviz_obj_bool">True</span>');
				} else {
					elem.append('<span class="visualizer_dataviz_obj_bool">False</span>');
				}

			} else if(typ == 'string') {
				// print as a double-quoted string literal
				var literal_str = obj.replace(new RegExp('\"', 'g'), '\\"'); // replace ALL
				literal_str = '"' + literal_str + '"';

				var block = $('<span class="visualizer_dataviz_obj_string"></span>');
				block.text(literal_str)
				elem.append(block);

			} else if(typ == 'object') {
				assert($.isArray(obj));

				var idStr = '';
				idStr = ' (id=' + getObjectID(obj) + ')';

				if(obj[0] == 'LIST') {
					assert(obj.length >= 2);
					if(obj.length == 2) {
						elem.append('<div class="visualizer_dataviz_typename">empty list' + idStr + '</div>');
					} else {
						elem.append('<div class="visualizer_dataviz_typename">list' + idStr + ':</div>');

						elem.append('<table class="visualizer_dataviz_list"><tr></tr><tr></tr></table>');
						var table = elem.children('table');
						var header = table.find('tr:first');
						var content = table.find('tr:last');
						jQuery.each(obj, function(ind, val) {
							if(ind < 2) return; // skip 'LIST' tag and ID entry

							// add a new column and then pass in that newly-added column
							// as elem to the recursive call to child:
							header.append('<td class="visualizer_dataviz_list_header"></td>');
							header.find('td:last').append(ind - 2);

							content.append('<td class="visualizer_dataviz_list_element"></td>');
							renderData(val, content.find('td:last'));
						});
					}

				} else if(obj[0] == 'TUPLE') {
					assert(obj.length >= 2);
					if (obj.length == 2) {
						elem.append('<div class="visualizer_dataviz_typename">empty tuple' + idStr + '</div>');
					} else {
						elem.append('<div class="visualizer_dataviz_typename">tuple' + idStr + ':</div>');
						elem.append('<table class="visualizer_dataviz_tuple"><tr></tr><tr></tr></table>');

						var table = elem.children('table');
						var header = table.find('tr:first');
						var content = table.find('tr:last');

						jQuery.each(obj, function(ind, val) {
							if (ind < 2) return; // skip 'TUPLE' tag and ID entry

							// add a new column and then pass in that newly-added column
							// as elem to the recursive call to child:
							header.append('<td class="visualizer_dataviz_tuple_header"></td>');
							header.find('td:last').append(ind - 2);

							content.append('<td class="visualizer_dataviz_tuple_element"></td>');
							renderData(val, content.find('td:last'));
						});
					}

				} else if(obj[0] == 'SET') {
					assert(obj.length >= 2);
					if(obj.length == 2) {
						elem.append('<div class="visualizer_dataviz_typename">empty set' + idStr + '</div>');
					} else {
						elem.append('<div class="visualizer_dataviz_typename">set' + idStr + ':</div>');
						elem.append('<table class="visualizer_dataviz_set"></table>');
						var table = elem.children('table');
						// create an R x C matrix:
						var length = obj.length - 2;
						// gives roughly a 3x5 rectangular ratio, square is too, err,
						// 'square' and boring
						var rows_count = Math.round(Math.sqrt(length));
						if(rows_count > 3) {
							rows_count -= 1;
						}

						var cols_count = Math.round(length / rows_count);
						// round up if not a perfect multiple:
						if(length % rows_count) {
							cols_count += 1;
						}

						var row;
						jQuery.each(obj, function(ind, val) {
							if(ind < 2) return; // skip 'SET' tag and ID entry

							if(((ind - 2) % cols_count) == 0) {
								row = $('<tr></tr>');
								table.append(row);
							}

							row.append('<td class="visualizer_dataviz_set_element"></td>');
							renderData(val, row.find('td:last'));
						});
					}

				} else if(obj[0] == 'DICT') {
					assert(obj.length >= 2);
					if(obj.length == 2) {
						elem.append('<div class="visualizer_dataviz_typename">empty dict' + idStr + '</div>');
					} else {
						elem.append('<div class="visualizer_dataviz_typename">dict' + idStr + ':</div>');
						var table = $('<table class="visualizer_dataviz_dict"></table>');
						elem.append(table);

						$.each(obj, function(ind, kvPair) {
							if(ind < 2) return; // skip 'DICT' tag and ID entry

							var row = $('<tr class="visualizer_dataviz_dict_entry"><td class="visualizer_dataviz_key"></td><td class="visualizer_dataviz_value"></td></tr>');
							var key_block = row.find('td:first');
							var val_block = row.find('td:last');

							renderData(kvPair[0], key_block);
							renderData(kvPair[1], val_block);

							table.append(row);
						});
					}

				} else if(obj[0] == 'INSTANCE') {
					assert(obj.length >= 3);
					elem.append('<div class="visualizer_dataviz_typename">' + obj[1] + ' instance' + idStr + '</div>');

					if(obj.length > 3) {
						elem.append('<table class="visualizer_dataviz_instance"></table>');
						var table = elem.children('table');
						$.each(obj, function(ind, kvPair) {
							if(ind < 3) return; // skip type tag, class name, and ID entry

							var row = $('<tr class="visualizer_dataviz_instance_entry"><td class="visualizer_dataviz_instance_key"></td><td class="visualizer_dataviz_instance_value"></td></tr>');
							var key_block = row.find('td:first');
							var val_block = row.find('td:last');

							// the keys should always be strings, so render them directly (and without quotes):
							assert(typeof(kvPair[0]) == 'string');
							key_block.html('<span class="visualizer_dataviz_key_obj"></span>');
							key_block.children('span').text(kvPair[0]);

							// values can be arbitrary objects, so recurse:
							renderData(kvPair[1], val_block);

							table.append(row);
						});
					}

				} else if (obj[0] == 'CLASS') {
					assert(obj.length >= 4);
					var superclassStr = '';
					if(obj[3].length > 0) {
						superclassStr += ('[extends ' + obj[3].join(',') + '] ');
					}

					elem.append('<div class="visualizer_dataviz_typename">' + obj[1] + ' class ' + superclassStr + idStr + '</div>');

					if(obj.length > 4) {
						elem.append('<table class="visualizer_dataviz_class"></table>');
						var table = elem.children('table');
						$.each(obj, function(ind, kvPair) {
							if(ind < 4) return; // skip type tag, class name, ID, and superclasses entries

							var row = $('<tr class="visualizer_dataviz_class_entry"><td class="visualizer_dataviz_class_key"></td><td class="visualizer_dataviz_class_value"></td></tr>');
							var key_block = row.find('td:first');
							var val_block = row.find('td:last');

							// the keys should always be strings, so render them directly (and without quotes):
							assert(typeof(kvPair[0]) == 'string');
							key_block.append('<span class="visualizer_dataviz_key_obj"></span>');
							key_block.find('span:last').text(kvPair[0]);

							// values can be arbitrary objects, so recurse:
							renderData(kvPair[1], val_block);

							table.append(row);
						});
					}
				} else if(obj[0] == 'CIRCULAR_REF') {
					assert(obj.length == 2);
					elem.append('<div class="visualizer_dataviz_circref">circular reference to id=' + obj[1] + '</div>');

				} else {
					// render custom data type
					assert(obj.length == 3);
					typeName = obj[0];
					id = obj[1];
					strRepr = obj[2];

					// if obj[2] is like '<generator object <genexpr> at 0x84760>',
					// then display an abbreviated version rather than the gory details
					noStrReprRE = /<.* at 0x.*>/;
					if(noStrReprRE.test(strRepr)) {
						elem.append('<span class="visualizer_dataviz_obj_custom">' + typeName + idStr + '</span>');

					} else {
						// warning: we're overloading tuple elts for custom data types
						elem.append('<div class="visualizer_dataviz_typename">' + typeName + idStr + ':</div>');
						elem.append('<table class="visualizer_dataviz_tuple"><tr><td class="visualizer_dataviz_element"></td></tr></table>');
						elem.find('.visualizer_dataviz_element:last').text(strRepr);
					}
				}
			} else {
				alert('Error: renderData FAIL!');
			}
		}

		plumb.repaintEverything(); // redraw, because endpoints position may be changed
	}


	function fireEvent(event) {
		var args = $.merge([], arguments); // arguments is not a list, it's an object, so transform it
		var result = true;

		args.shift(); // delete first, "event" argument

		$.each(event_subscribers[event], function(i, callback) {
			var res = callback.apply(viss, args);
			result = result && (res !== false);
		});

		return result;
	}

	function on(event, callback) {
		if(!(event in event_subscribers) || typeof(callback) !== 'function') {
			return false;
		}

		event_subscribers[event].push(callback);
		return true;
	}


	function run() {
		if(!fireEvent('before_run', options.explain_mode ? 'explain' : 'simple')) {
			return;
		}

		var req = $.post('//evaler.pythontutor.ru/eval', {
			user_script: viss.code,
			input_data : viss.stdin,
			explain    : options.explain_mode
		});

		clear();

		current_code = viss.code;
		code_changed = false;
		has_ever_runned = true;
		is_executing = true;

		updateUI();

		req.done(function(server_res) {
			is_executing = false;

			if(server_res.result == 'internal_error') {
				alert('На сервере случилась какая-то ошибка.');
				setStatus('Ошибка сервера');
				return;
			} else if(server_res.result == 'realtime_limited') {
				alert('Ваш код слишком долго выполнялся и был остановлен досрочно. Возможно, в программе содержится бесконечный цикл.');
				setStatus('Таймаут выполнения кода');
				return;
			}

			if(options.explain_mode) {
				_explain(server_res);
			} else {
				_show(server_res);
			}

			var stdout = server_res.stdout;
			if(stdout === undefined && trace !== undefined)
				stdout = trace[trace.length - 1].stdout;

			fireEvent('after_run', server_res.result, stdout);
		});

		req.fail(function() {
			fireEvent('after_run', false);
			alert('Не удалось выполнить запрос к серверу. Возможно, нет соединения с интернетом.');
		});
	}

	function _explain(server_res) {
		trace = server_res.trace;
		_processTrace();
		jumpToBegin();
	}

	function _show(server_res) {
		_clearCurrent();

		current.stdout = server_res.stdout;

		current.is_error = (server_res.exception !== null);
		if(current.is_error) {
			current.line = server_res.exception.line - 1;
			current.error_msg = server_res.exception.exception_msg;
			current.error_translation = server_res.exception.exception_translation;
			current.error_type = server_res.exception.exception_type;
		}

		updateUI();
	}


	///// Error translation rate helpers /////

	var rate_question_data;

	function _init_rate_question(error_msg, error_translation, code, stdin) {
		rate_question_data = {
			error_msg: error_msg,
			error_translation: error_translation,
			code: code,
			stdin: stdin
		};
		blocks.error_rate_question.show();
		blocks.error_rate_thank.hide();
	}

	function _hide_rate_question() {
		blocks.error_rate_question.hide();
		blocks.error_rate_thank.hide();
	}

	function _record_rate_choice(helped) {
		log_user_action('error_rate', {
			helped: helped,
			rate_question_data: rate_question_data
		});

		blocks.error_rate_question.hide();

		if (helped) {
			blocks.error_rate_thank.text('Спасибо.');
		} else {
			blocks.error_rate_thank.text('Спасибо, мы попробуем улучшить его.');
		}
		blocks.error_rate_thank.show();
	}

	function log_user_action(action, data) {
		$.post('/log_user_action/', {
			action: action,
			data: JSON.stringify(data)
		});
	}


	// create UI
	_setupUI();

	// create public methods and properties

	function _editorValueProperty(editor) {
		return {
			enumerable: true,

			get: function() {
				return editor.getValue();
			},

			set: function(value) {
				editor.setValue(value);
				editor.selection.clearSelection();
				editor.moveCursorTo(0, 0);
			}
		}
	}

	this.focusCodeEditor = focusCodeEditor;
	this.clear = clear;
	this.reset = reset;

	this.jumpToBegin = jumpToBegin;
	this.jumpToEnd = jumpToEnd;

	this.setInstruction = setInstruction;

	this.run = run;

	this.on = on;

	this.setStatus = setStatus;

	Object.defineProperty(this, 'code', _editorValueProperty(editors.code));
	Object.defineProperty(this, 'stdin', _editorValueProperty(editors.stdin));


	editors.code.moveCursorTo(0, 0);
	editors.stdin.moveCursorTo(0, 0);

	if(options.auto_height) {
		autoHeight(editors.code);
	}


	_clearCurrent();


	return this;
}
