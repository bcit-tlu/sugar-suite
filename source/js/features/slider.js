(function ($) {
    $(".slider").each(initSlider);

    function initSlider() {
        var $slider = $(this);
        var $figureImage = $slider.find(">figure.img");
        var index = new Index($figureImage.length);

        $slider.css({"height": "600px", "max-height": "550px", "background-color": "black", "overflow": "hidden"});

        var figureImageHeight = $figureImage.filter(":visible").height();
        var $prevButton = $("<button>").addClass("prev").append($('<div>').addClass('prev-style').html("&#8249;"));
        var $nextButton = $("<button>").addClass("next").append($('<div>').addClass('next-style').html("&#8250;"));
        
        var $nav = $("<ul>").addClass("gallery-nav")
            .append(
                $("<li class='show-caption'>").html("<button>Hide caption &#9660;</button>"),
                $("<li class='show-index'>").html("1 of " + $figureImage.length),
                $("<li class='show-border'>").html("<hr>|</hr>"),
                $("<li class='show-fullscreen'>").html("<button><i class='fa fa-expand'></i></button>")
            );
            
        $figureImage.not(":first").hide(); // Show first Figure

        $slider.prepend($prevButton);
        $slider.append($nextButton);
        $prevButton.css({ "height": $slider.height()-50, "width": $prevButton.children(".prev-style").width() + 5});
        $nextButton.css({ "height": $slider.height()-50, "width": $nextButton.children(".next-style").width() + 5});

        // Create a modal for full-screen based by the original slider
        var $modal = $slider.clone().removeClass().addClass("slider-modal")
            .append($("<button>").addClass("close-fs").html("&#10006;"));

        //Change the original prev/next button class for full-screen mode
        var $fsPrevButton = $modal.find(".prev").removeClass().css({"height": "auto", "width": "auto"}).addClass("prev-fs");
        var $fsNextButton = $modal.find(".next").removeClass().css({"height": "auto", "width": "auto"}).addClass("next-fs");

        $slider.append($nav, $modal); // , $('<div>').addClass('sidemenu')
        //$slider.append($nav, $modal); // , $('<div>').addClass('revealSidemenu').html('<p> click me</p>')
        var $sliderModal = $slider.find(".slider-modal");
        $sliderModal.removeAttr('style');
        var $modalImages = $sliderModal.children("figure.img");
        // Modal numbering
        $modalImages.each(
            function(index){
                $(this).prepend($("<p class='index-fs'>").text((index + 1) + " of " + $figureImage.length));
            }
        );
        
        $figureImage.children("h2").css({"position": "absolute", "background-color": "rgba(51,51,51,.7)", "color": "white", "text-wrap": "wrap"});
        $figureImage.children("img").css({"position": "absolute"});
        $figureImage.children("figcaption").css({"position": "absolute", "background-color": "rgba(51,51,51,.7)", "color": "white"});
        /* $figureImage.children("figcaption").children("*").css({"color": "white"}); */

        // Hide first figcaption if there's no figcaption
        if($slider.find(">figure.img:first").children("figcaption").length == 0){
            $nav.children(".show-caption").css({visibility: "hidden"});
        }

        // Add function to buttons
        $prevButton.on("click", changeImage);
        $nextButton.on("click", changeImage);
        $fsPrevButton.on("click", changeFullScreenImage);
        $fsNextButton.on("click", changeFullScreenImage);
        $modalImages.hide(); // Hide modal/fullscreen mode
        
        // Close fullscreen mode
        $sliderModal.find(".close-fs").on("click", function () {
            $("body").css("overflow", "unset");
            $slider.find(".full-screen").remove();
            $sliderModal.hide();
            $(this).siblings().hide();
            $slider.find(".show-index").text((index.getIndex() + 1) + " of " + $figureImage.length);
            $figureImage.css({ "display": "none", "left": "0px" });
            $figureImage.eq([index.getIndex()]).css({ "opacity": "1", "display": "block" });
            exitFullScreen();
        });
        
        // Show and hide slider caption
        $nav.find(".show-caption").on("click", function () {
            $figureImage.children("figcaption").toggle();
            var $toggleButton = $(this).children("button");
            var isOpened = $toggleButton.text().trim() === "Hide caption ▼";
            if(isOpened) {
                $toggleButton.html("Show caption &#9650;");
                $(this).css({"backgroundColor":"$gray-base"});
            } else {
                $toggleButton.html("Hide caption &#9660;");
                 $(this).css({"backgroundColor":"$gray-base"});
            }
        });

        // Show slider in fullscreen mode
        $nav.find(".show-fullscreen").on("click", function () {
            enterFullScreen();
            var $overlay = $("<div>").addClass("full-screen");
            $slider.append($overlay);
            $sliderModal.css("display", "flex");
            $modalImages.eq(index.getIndex()).show().css("opacity", "1");
            $sliderModal.children("button").show();
            $("body").css("overflow", "hidden");
        });

        // Keep modal state in sync when the browser exits fullscreen for any reason
        // (Esc key, opening a link in a new tab, switching apps, etc.)
        $(document).on(
            "fullscreenchange webkitfullscreenchange mozfullscreenchange MSFullscreenChange",
            function () {
                var fsElement = document.fullscreenElement ||
                    document.webkitFullscreenElement ||
                    document.mozFullScreenElement ||
                    document.msFullscreenElement;
                if (fsElement || !$sliderModal.is(":visible")) return;
                $("body").css("overflow", "unset");
                $slider.find(".full-screen").remove();
                $sliderModal.hide();
                $sliderModal.find(".close-fs").siblings().hide();
                $modalImages.hide();
                $slider.find(".show-index").text((index.getIndex() + 1) + " of " + $figureImage.length);
                $figureImage.css({ "display": "none", "left": "0px" });
                $figureImage.eq([index.getIndex()]).css({ "opacity": "1", "display": "block" });
            }
        );

        // Change the current image to the prev/next image + animation
        function changeImage() {
            var $currentFigure = $figureImage.filter(":visible");
            var isNext = $(this).is(".next");
            var sliderWidth = $slider.width();
            var animateLeftSize, cssLeftSize;

            // increment or decrement index
            if (isNext) {
                index.increment();
                animateLeftSize = "-=" + sliderWidth + "px";
                cssLeftSize = sliderWidth + "px";
            } else {
                index.decrement();
                animateLeftSize = "+=" + sliderWidth + "px";
                cssLeftSize = "-" + sliderWidth + "px";
            }

            $slider.find(".prev, .next").prop('disabled', true);

            var $nextFigure = $figureImage.eq(index.getIndex());
            $currentFigure.stop().animate({ "left": animateLeftSize, "opacity": "0" }, "fast").promise().done(function () {
                $currentFigure.css({ "display": "none", "left": "0px" });
                $nextFigure.css({ "left": cssLeftSize, "display": "block" });

                $nextFigure.stop().animate({ "left": animateLeftSize, "opacity": "1" }, "fast").promise().done(function () {
                    $nextFigure.css({ "left": "0px" });
                    $slider.find(".prev, .next").prop('disabled', false);
                });
            });
            
            $slider.find(".show-index").text((index.getIndex() + 1) + " of " + $figureImage.length);
            if($nextFigure.children("figcaption").length == 0){
                $nav.children(".show-caption").css({visibility: "hidden"});
            } else {
                $nav.children(".show-caption").css({visibility: "visible"});
            }
            
        }

        // Change image on fullscreen mode
        function changeFullScreenImage() {
            var $modalCurrentFigure = $modalImages.filter(":visible");
            var isNext = $(this).is(".next-fs");
            var sliderWidth = $slider.width();
            var animateLeftSize, cssLeftSize;

            // increment or decrement index
            if (isNext) {
                index.increment();
                animateLeftSize = "-=" + sliderWidth + "px";
                cssLeftSize = sliderWidth + "px";
            } else {
                index.decrement();
                animateLeftSize = "+=" + sliderWidth + "px";
                cssLeftSize = "-" + sliderWidth + "px";
            }

            $sliderModal.find(".prev-fs, .next-fs").prop('disabled', true);

            var $modalNextFigure = $modalImages.eq(index.getIndex());
            $modalCurrentFigure.stop().animate({ "left": animateLeftSize, "opacity": "0" }, "fast").promise().done(function () {
                $modalCurrentFigure.css({ "display": "none", "left": "0px" });
                $modalNextFigure.css({ "left": cssLeftSize, "display": "block" });

                $modalNextFigure.stop().animate({ "left": animateLeftSize, "opacity": "1" }, "fast").promise().done(function () {
                    $modalNextFigure.css({ "left": "0px" });
                    $sliderModal.find(".prev-fs, .next-fs").prop('disabled', false);

                    var isScroll = ($modalNextFigure[0].scrollHeight - $(window).height() > 0) ? true : false;
                    var scrollbarWidth = $modalNextFigure.outerWidth() - $modalNextFigure.children("h2").outerWidth();
                    if (isScroll) {
                        if (scrollbarWidth > 0){
                            var right = parseInt($fsNextButton.css("right"), 10);
                            if (right === 0) {
                                $sliderModal.find(".close-fs, .next-fs").animate({"right" : "+=" + scrollbarWidth});
                            }        
                        }
                    } else {
                        $sliderModal.find(".close-fs").animate({"right" : "0" });
                        $sliderModal.find(".next-fs").animate({"right" : "0" });
                    }

                });
                

            });
            
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

        // If screen height/width change, calculate the slider height
        $(window).on('resize', function () {
            var height = $(window).height() * 0.8 + 50 < 600 ? $(window).height() * 0.8 + 50 : "600px";
            $slider.css({ "height": height});
            $prevButton.css({ "height": $slider.height()-50, "width": $slider.find(".prev-style").width() + 5});
            $nextButton.css({ "height": $slider.height()-50, "width": $slider.find(".next-style").width() + 5});
        });
    }

    function enterFullScreen() {
		var d = document;
		var fsElement = d.fullscreenElement ||
			d.webkitFullscreenElement ||
			d.mozFullScreenElement ||
			d.msFullscreenElement;
		if (fsElement) return;
		var el = d.documentElement;
		var requestMethod = el.requestFullscreen ||
			el.webkitRequestFullscreen ||
			el.mozRequestFullScreen ||
			el.msRequestFullscreen;
		if (!requestMethod) return;
		var req = requestMethod.call(el);
		if (req && typeof req.catch === "function") {
			req.catch(function () {});
		}
	}

	function exitFullScreen() {
		var d = document;
		var fsElement = d.fullscreenElement ||
			d.webkitFullscreenElement ||
			d.mozFullScreenElement ||
			d.msFullscreenElement;
		if (!fsElement) return;
		var exitMethod = d.exitFullscreen ||
			d.webkitExitFullscreen ||
			d.mozCancelFullScreen ||
			d.msExitFullscreen;
		if (!exitMethod) return;
		var exit = exitMethod.call(d);
		if (exit && typeof exit.catch === "function") {
			exit.catch(function () {});
		}
	}
}(jQuery));