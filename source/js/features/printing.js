/*******
Printing
********/
(function () {
	
	function beforePrinting() {
		$("._bellow").show();
		$(".reveal-button").next().show();
	}

	function afterPrinting() {
		$("._bellow").hide();
		$(".reveal-button").next().hide();
	}
	
    
    // @see http://tjvantoll.com/2012/06/15/detecting-print-requests-with-javascript/
    document.addEventListener("beforePrinting", beforePrinting, false);

    document.addEventListener("afterPrinting", afterPrinting, false);
	
	var beforePrintEvent = function() {
        document.dispatchEvent(new CustomEvent("beforePrinting"));
	};
	var afterPrintEvent = function() {
        document.dispatchEvent(new CustomEvent("afterPrinting"));
	};

    if (window.matchMedia) {
        var mediaQueryList = window.matchMedia('print');
        mediaQueryList.addListener(function (mql) {
            if (mql.matches) {
				beforePrintEvent();
            } else {
				afterPrintEvent();
            }
        });
    }

    window.onbeforeprint = beforePrintEvent;
    window.onafterprint = afterPrintEvent;

}());