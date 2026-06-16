(function ($) {
	$(".swapper").each(initSwapper);

	function initSwapper() {
		var $swapper = $(this); // used in handleButtonPress
		var $slides = $(this).children(); // used in handleButtonPress
		var index = new Index($slides.length); // used in handleButtonPress
		var $youtube = $swapper.find("iframe[src*='youtube']"); // used in handleButtonPress
		var animating = false; // used in handleButtonPress
		var $prevButton = $("<button>");
		var $nextButton = $("<button>");
		var $buttonBox = $("<div>"); // used in handleButtonPress
		var $display = $("<span>"); // used in handleButtonPress

		$prevButton.text("Prev").addClass("prev");
		$nextButton.text("Next").addClass("next");
		$display.text(index.getDisplayText()).addClass("display");
		$buttonBox.addClass("button-box");
		$buttonBox.append($prevButton, $display, $nextButton);
		$prevButton.on("click", handleButtonPress);
		$nextButton.on("click", handleButtonPress);
		$swapper.append($buttonBox);

		$slides.not(":first-child").hide();
		enableYoutubeJSAPI($youtube);

		function handleButtonPress() {
			var isNext = $(this).is(".next");
			var $showing = $slides.filter(":visible");
			var buttonBoxHeight = $buttonBox.outerHeight(true);
			var $toBeShown, slideHeight;

			// check if animating
			if (animating) {
				return;
			}
			animating = true;

			// increment or decrement index
			if (isNext) {
				index.increment();
			} else {
				index.decrement();
			}

			// move back to the top of the swapper
			$([document.documentElement, document.body]).animate({
				scrollTop: $(this).closest(".swapper").offset().top
			}, 1000);

			// briefly show then hide to get height
			$toBeShown = $slides.eq(index.getIndex());
			$toBeShown.show();
			slideHeight = $toBeShown.outerHeight(true);
			$toBeShown.hide();
			
			// set height to current height
			$swapper.css("height", $swapper.outerHeight());
			
			// anchor button box to bottom
			$buttonBox.css({
				position: "absolute",
				bottom: 0,
				display: "block",
				width: $buttonBox.outerWidth()
			});
			
			// pause YouTube videos
			pauseYoutubeVideos($youtube);
			
			// change slides
			$showing.fadeOut('fast', function() {
				$toBeShown.fadeIn().promise().done(function(){
					if($(this).find(".line-matching") || $(this).find(".tabs")){
						$(window).trigger('resize');
					}
				});
            });
			
			// update display counter
			$display.text(index.getDisplayText());
			
			// Animate height
			$swapper.stop().animate({
				"height": slideHeight + buttonBoxHeight
			}, 400, function () {
				$swapper.css("height", "auto");
				animating = false;

				// de-anchor button box
				$buttonBox.css({
					position: "relative",
					display: "inline-block",
					width: "auto"
				});				
			});
		}
	}

	function Index(_length) {
		var length = _length;
		var index = 0;

		this.getIndex = function () {
			return index;
		};
		this.getLength = function () {
			return length;
		};
		this.getDisplayText = function () {
			return (index + 1) + "/" + length;
		};
		this.increment = function () {
			if (index < length - 1) {
				index++;
			} else {
				index = 0;
			}
		};
		this.decrement = function () {
			if (index > 0) {
				index--;
			} else {
				index = length - 1;
			}
		};
	}

	function enableYoutubeJSAPI($iframes) {
		$iframes.each(function () {
			var src = $(this).attr("src");
			if (src.indexOf("?") === -1) {
				src += "?enablejsapi=1";
			} else {
				src += "&enablejsapi=1";
			}
			$(this).attr("src", src);
		});
	}

	function pauseYoutubeVideos($iframes) {
		$iframes.each(function () {
			$(this)[0].contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
		});
	}

}(jQuery));
