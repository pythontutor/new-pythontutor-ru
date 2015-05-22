var visualizer;

$(function() {
	visualizer = new Visualizer('#visualizer', '', '', {'show_stdin_initially': true});
	visualizer.focusCodeEditor();


	$('#exampleLinks a').click(function(e) {
		visualizer.reset();
		visualizer.setStatus('Загрузка...');

		var loading_status = 0;

		function loaded() {
			loading_status += 1;
			if(loading_status == 2) {
				visualizer.setStatus('');
				visualizer.run();
			}
		}


		var code_file = $(e.target).data('code');
		var input_file = $(e.target).data('input');

		$.get('/static/example-code/' + code_file, function(code) {
			visualizer.code = code;
			loaded();
		});

		if(typeof(input_file) !== 'undefined') {
			$.get('/static/example-code/' + input_file, function(stdin) {
				visualizer.stdin = stdin;
				loaded();
			});
		} else {
			visualizer.stdin = '';
			loaded();
		}

		return false;
	});

	$('#exampleLinks .default').click();

	$('.debug_me').click(function() {
		var row = $(this).parent().parent();

		visualizer.stdin = row.find('td.in').text();
		visualizer.run();

		// TODO когда отладчик дошел до конца, красить строку в нужный цвет

		var visualizer_top = $("#visualizer").offset().top - 65;
		if($('body').scrollTop() > visualizer_top) {
			$('body').animate({scrollTop: visualizer_top}, 500);
		}
	});

	function run_test(row) {
		var button = row.find('td i.run_me');
		console.debug(row)

		row.removeClass('danger success');
		button.removeClass('mdi-av-play-arrow').addClass('mdi-action-autorenew');

		var req = $.post('//evaler.pythontutor.ru/eval', {
			user_script: visualizer.code,
			input_data : row.find('td.in').text(),
			explain    : false,
		});

		req.done(function(response) {
			switch(response.result) {
				case 'ok':
					if(response.stdout.trim() === row.find('td.out').text().trim()) {
						row.addClass('success');
					} else {
						row.addClass('danger');
					}
					break;
				default:
					row.addClass('danger');
					break;
			};

			button.removeClass('mdi-action-autorenew').addClass('mdi-av-play-arrow');

			$('span.tests_passed').text(
				$('tr.test-row.success').length
			);

			if ($('tr.test-row.success').length === $('tr.test-row').length) {
				$('a.run_tests').removeClass('btn-info').addClass('btn-success');
			} else {
				$('a.run_tests').removeClass('btn-success').addClass('btn-info');
			}
		});

		req.fail(function(response) {
			button.removeClass('mdi-action-autorenew').addClass('mdi-av-play-arrow');
		});
	}

	$('.run_me').click(function() {
		var button = $(this);
		var row = button.parent().parent();

		run_test(row);
	});

	$('.run_tests').click(function() {
		$(this).removeClass('btn-success').addClass('btn-info');
		$('span.tests_passed_badge').show();

		$('tr.test-row').each(function(index) {
			run_test($(this));
		});
		// TODO disable button while tests are running (use http://salesforce.stackexchange.com/questions/12424/wait-for-each-contained-async-calls-to-complete-before-redirect)
	});

	$('.submit_solution').click(function() {
		var req = $.post('submissions/', {
			code: visualizer.code
		});

		req.done(function(response) {
			$('.submission_history').prepend('<li><a href="javascript:void(0)" data-submission-id="' + response.id + '">' + response.date + '</a></li>')
			$('.submission_history_button').removeClass('disabled').addClass('btn-info');

			$.snackbar({
				content: 'Решение от ' + response.date + ' сохранено'
			})
		});
	});

	$('.dropdown-menu').on('click', 'a', function() {
		var req = $.get('submissions/' + $(this).data('submission-id') + '/');

		req.done(function(response) {
			visualizer.code = response.code;

			$.snackbar({
				content: 'Решение от ' + response.date + ' загружено'
			})
		});
	});

});
