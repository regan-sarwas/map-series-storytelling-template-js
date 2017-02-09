define(["lib-build/tpl!./ViewHeader",
		"lib-build/css!./ViewHeader",
		'../media/image/FileUploadHelper',
		'../media/image/ImageUploadHelper',
		"../../utils/CommonHelper",
		'dojo/_base/lang'],
	function (viewTpl, viewCss, fileUploadHelper, imageUploadHelper, CommonHelper, lang) {
		return function ViewHeader(options)
		{
			var _titleContainer = null,
				_contentContainer = null;

			var _logoInput = null,
				_logoBtn = null,
				_logoTargetInput = null,
				_badLogo = false;

			options = options || {};

			this.init = function(titleContainer, contentContainer)
			{
				_titleContainer = titleContainer;
				_contentContainer = contentContainer;
				_contentContainer.append(viewTpl(_.extend({}, i18n.commonCore.settingsHeader,
					{share: i18n.commonCore.builderPanel.buttonShare, 
						socialExplain: "For a standard NPS banner, enter the 4 letter UNITCODE (uppercase) for " + 
						"your park in the Text box and leave the Link box empty " + 
						"(a well known unit code will create a link automatically). " + 
						"For a non-standard banner, enter 'Main Text|Small Upper Text|Small Lower Text' " + 
						"in the Text box (some experimenting might be required).  If you want the 'Main Text' " + 
						"to be a hyperlink, enter the url in the Link box. " + 
						"The banner will not display when embeded in another page."}
				)));
				_logoInput = _contentContainer.find("#logoInput");
				_logoTargetInput = _contentContainer.find("#logoTargetInput");

				_logoInput.keydown(onLogoInputEnter);
				_logoInput.focusout(loadCustomLogo);
				_logoTargetInput.keydown(onTargetInputEnter);

				_logoBtn = _contentContainer.find('#uploadBtn');
				_logoBtn.on('change', onLogoUploadChange);
				$('.logo-btn-group').on('click', onBtnGroupClick);

				$("input[type=radio]", _contentContainer).click(onLogoRadioClick);
				$("#imgLogo", _contentContainer).error(onLogoLoadError);
				$("#imgLogo", _contentContainer).load(onLogoLoadComplete);

				$("input[name='optionsLogo']", _contentContainer).change(checkLogoOptionAndSetDisabled);

				_contentContainer.find(".form-config-size").toggle(options.smallSizeOpt);

				_contentContainer.find('.uploadHelp').tooltip({
					trigger: 'hover'
				});
			};

			this.present = function(settings)
			{
				var logoURL = settings.logoURL,
					themeColor = app.data.getWebAppData().getColors();

				$("#headerSimulator", _contentContainer).css("background-color", themeColor);
				if (logoURL == app.cfg.HEADER_LOGO_URL || logoURL == null) {
					$('input[name=optionsLogo]:eq(0)', _contentContainer).attr('checked', 'checked');
					$("#imgLogo", _contentContainer).show();
					_logoInput.val("");
					_logoTargetInput.val("");
				}
				else if (logoURL === "NO_LOGO") {
					$('input[name=optionsLogo]:eq(1)', _contentContainer).attr('checked', 'checked');
					_logoInput.val("");
					_logoTargetInput.val("");
				}
				else {
					$('input[name=optionsLogo]:eq(2)', _contentContainer).attr('checked', 'checked');
					$("#imgLogo", _contentContainer).attr("src", logoURL).show();
					if (CommonHelper.isAppResource(logoURL)) {
						$("#uploadLogoInput", _contentContainer).val(logoURL);
						onBtnGroupClick('upload');
					} else {
						$("#logoInput", _contentContainer).val(logoURL);
						onBtnGroupClick('link');
					}
					_logoTargetInput.val(settings.logoTarget);
				}

				checkLogoOptionAndSetDisabled();

				$("#selectSocialText", _contentContainer).val(settings.linkText === undefined ? app.cfg.HEADER_LINK_TEXT : settings.linkText);
				$("#selectSocialLink", _contentContainer).val(settings.linkURL === undefined ? app.cfg.HEADER_LINK_URL : settings.linkURL);

				// iPad keyboard workaround
				$("#selectSocialText", _contentContainer).blur(function(){ $(window).scrollTop(0); });
				$("#selectSocialLink", _contentContainer).blur(function(){ $(window).scrollTop(0); });
				$("#logoInput", _contentContainer).blur(function(){ $(window).scrollTop(0); });
				_logoTargetInput.blur(function(){ $(window).scrollTop(0); });

				// Social sharing
				if ( ! app.cfg.HEADER_SOCIAL.facebook )
					$(".enableFB", _contentContainer)
						.attr("disabled", "disabled")
						.parent()
						.addClass("disabled")
						.attr("title", i18n.commonCore.common.disabledAdmin);
				else if ( ! settings.social || settings.social.facebook )
					$(".enableFB", _contentContainer).prop('checked', true);

				if ( ! app.cfg.HEADER_SOCIAL.twitter )
					$(".enableTwitter", _contentContainer)
						.attr("disabled", "disabled")
						.parent()
						.addClass("disabled")
						.attr("title", i18n.commonCore.common.disabledAdmin);
				else if ( ! settings.social || settings.social.twitter )
					$(".enableTwitter", _contentContainer).prop('checked', true);

				if( ! app.cfg.HEADER_SOCIAL.bitly || ! app.cfg.HEADER_SOCIAL.bitly.enable || ! app.cfg.HEADER_SOCIAL.bitly.login || ! app.cfg.HEADER_SOCIAL.bitly.key )
					$(".enableBitly", _contentContainer)
						.attr("disabled", "disabled")
						.parent()
						.addClass("disabled")
						.attr("title", i18n.commonCore.common.disabledAdmin);
				else if ( ! settings.social || settings.social.bitly )
					$(".enableBitly", _contentContainer).prop('checked', true);

				updateForm();

				// Small size
				_contentContainer.find(".enableCompact").prop("checked", settings.compactSize || settings.compactSize === undefined);
			};

			this.show = function()
			{
				//setTimeout(function(){
					//var lblMaxWidth = Math.max.apply(Math, _contentContainer.find(".td-lbl").map(function(){ return $(this).width(); }).get());
					//_contentContainer.find(".td-lbl").css("min-width", lblMaxWidth);
				//}, 200);
			};

			this.save = function()
			{
				var logoOption = _contentContainer.find("input[name=optionsLogo]:checked").val();
				var logoURL;
				var logoTarget;
				var previewLogoSrc = _contentContainer.find(".imgLogo").attr('src');

				if (logoOption == "esri") {
					logoURL = null;
					logoTarget = "";
				}
				else if (logoOption == "none" || !previewLogoSrc) {
					logoURL = "NO_LOGO";
					logoTarget = "";
				}
				else {
					logoURL = _badLogo ? app.cfg.HEADER_LOGO_URL : CommonHelper.prependURLHTTP(previewLogoSrc);
					logoTarget = _logoTargetInput.val();
				}

				// Basic XSS check
				var linkText = $("#selectSocialText", _contentContainer).val() || '';
				linkText = linkText.replace(/<\/?script>/g,'');

				var linkURL = $("#selectSocialLink", _contentContainer).val() || '';
				linkURL = linkURL.replace(/<\/?script>/g,'');

				return {
					linkText: linkText,
					linkURL: CommonHelper.prependURLHTTP(linkURL),
					logoURL: logoURL,
					logoTarget: CommonHelper.prependURLHTTP(logoTarget),
					social: {
						facebook: $(".enableFB").prop('checked'),
						twitter: $(".enableTwitter").prop('checked'),
						bitly: $(".enableBitly").prop('checked')
					},
					compactSize: _contentContainer.find(".enableCompact").prop("checked")
				};
			};

			function checkLogoOptionAndSetDisabled() {
				var customLogoTable = _contentContainer.find('.optionsLogoCustom');
				var logoOption = $("input[name='optionsLogo']:checked", _contentContainer).val();
				customLogoTable.toggleClass('hidden', logoOption !== 'custom');
			}

			function onBtnGroupClick(evt) {
				var btn;
				if (evt === 'link') {
					btn = $('#linkRadio');
				} else if (evt === 'upload') {
					btn = $('#uploadRadio');
				} else {
					btn = $(evt.target).closest('.btn');
					if (btn.attr('disabled')) {
						return;
					}
				}

				toggleCustomLogoButtons(btn);
				loadCustomLogo();

			}

			function toggleCustomLogoButtons(activeBtn) {
				var group = _contentContainer.find('.logo-btn-group');
				activeBtn = activeBtn || group.find('.btn.active');
				var isUpload = activeBtn.closest('#uploadRadio').length === 1;

				group.find('.btn').removeClass('active');
				activeBtn.addClass('active');

				_contentContainer.find('#uploadBtn').toggleClass('hidden', !isUpload);
				_contentContainer.find('#logoInput').toggleClass('hidden', isUpload);

			}

			function hideUpload() {
				toggleCustomLogoButtons($('#linkRadio'));
				$('#uploadRadio').attr('disabled', 'disabled');
			}

			function onLogoUploadChange(evt) {
				var file = evt.target.files ? evt.target.files[0] : null;
				if (!file) {
					console.warn('no file', evt);
					return;
				}
				if (!fileUploadHelper.validateFile(file)) {
					console.warn('file not valid');
					setInfoText();
					return;
				}
				imageUploadHelper.processLogo(file).then(lang.hitch(this, uploadFile), lang.hitch(this, processError));

			}

			function uploadFile(fileDetails) {
				fileUploadHelper.uploadSingleResource(fileDetails).then(lang.hitch(this, uploadFileSuccess), lang.hitch(this, uploadFileError));
			}

			function uploadFileSuccess(uploadResult) {
				var url = CommonHelper.prependURLHTTP(CommonHelper.possiblyAddToken(uploadResult.picUrl));
				_contentContainer.find('#uploadLogoInput').val(url);
				_contentContainer.find(".imgLogo").attr("src", url).show();
				resetFileInput();
			}

			function uploadFileError(err) {
				console.warn('uploadFileError', err);
				setInfoText();
				resetFileInput();
			}

			function resetFileInput() {
				var target = _logoBtn.find('input');
				if (!target.length) {
					return;
				}
				target[0].value = '';
			}

			function setInfoText(str) {
				_contentContainer.find('.info-text').text(str || i18n.commonCore.settingsHeader.logoUploadGenericError);
				var infoTextRow = _contentContainer.find('.upload-warnings');
				infoTextRow.removeClass('hidden');
				setTimeout(function() {
					infoTextRow.addClass('hidden');
				}, 6000);
			}

			function processError(err) {
				console.warn('processError', err);
				if (!err || !err.reason) {
					return;
				}
				var errorMessage;
				if (err.reason === 'gif dimensions') {
					errorMessage = i18n.commonCore.settingsHeader.logoUploadSizeError.replace('${PIXEL-WIDTH}', err.details);
				}
				setInfoText(errorMessage);
				resetFileInput();
			}

			function onLogoRadioClick()
			{
				updateForm();
			}

			function onLogoLoadComplete()
			{
			}

			function onLogoLoadError()
			{
				_badLogo = true;
				_contentContainer.find(".imgLogo").hide();
			}

			function onLogoInputEnter(event)
			{
				if (event.keyCode == 13) {
					_badLogo = false;
					loadCustomLogo();
					return false;
				}
				// Fix for webkit browser - if the text exceeded the input size, after hitting backspace the modal shifted
				// Focusing the field after backspace the field is the only fix found
				else if (event.keyCode == 8 ) {
					$("#logoTargetInput").focus();
					$("#logoInput").focus();
				}
			}

			function loadCustomLogo()
			{
				var targetId = $('#linkRadio', _contentContainer).hasClass('active') ? '#logoInput' : '#uploadLogoInput';
				var logoUrl = $(targetId, _contentContainer).val().trim();
				_contentContainer.find(".imgLogo").attr("src", CommonHelper.prependURLHTTP(CommonHelper.possiblyAddToken(logoUrl))).show();
			}

			function onTargetInputEnter(event)
			{
				// Fix for webkit browser - if the text exceeded the input size, after hitting backspace the modal shifted
				// Focusing the field after backspace the field is the only fix found
				if (event.keyCode == 8 ) {
					$("#logoInput").focus();
					$("#logoTargetInput").focus();
				}
			}

			function updateForm()
			{
				var logoOption = $("input[name=optionsLogo]:checked", _contentContainer).val();

				_contentContainer.find(".imgLogo").hide();

				if (logoOption == "custom") {
					if (!CommonHelper.getItemId()) {
						hideUpload();
					} else {
						$('#uploadRadio').removeAttr('disabled');
						toggleCustomLogoButtons();
						loadCustomLogo();
					}
				} else if (logoOption == "esri") {
					_contentContainer.find(".imgLogo").attr("src", "resources/tpl/viewer/icons/esri-logo.png").show();
				}
			}

			this.initLocalization = function()
			{
				_titleContainer.html(i18n.commonCore.settingsHeader.title);
			};
		};
	}
);
