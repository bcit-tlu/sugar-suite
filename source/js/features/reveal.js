// SHOW/HIDE CONTENT (#REVEAL)

$(document).ready(function () {
    $(".reveal, .active-reveal").each(function () {
        // Reveal button text
        var buttonText = $(this).data("button") || "Reveal";
        var $button = $("<button class='reveal-button'>" + buttonText + "</button>");

        // Minimum length needed in order to enable reveal button
        var inputLength = $(this).data("min-text");

        // active-reveal component
        if (inputLength) {
            // Textarea placeholder text
            var placeholder = $(this).data("placeholder") || "Type your answer here";

            // Number of rows of the textarea
            var rows = $(this).data("rows") || 5;

            var $textarea = $("<textarea class='reveal-textarea'></textarea>");
            $textarea.attr("placeholder", placeholder);

            if (rows) {
                $textarea.attr("rows", rows);
                $(this).before($textarea);
            }

            $button.prop("disabled", true);

            // Listen to changes textarea
            $textarea.on('keyup', function (event) {
                var currentLength = $(this).val();
                if (currentLength.length < inputLength) {
                    $button.prop("disabled", true);
                } else {
                    $button.prop("disabled", false);
                }
            });

            // Turn off textarea listener after reveal button is clicked
            $button.one("click", function (event) {
                $textarea.off();
            });
        }

        $(this).before($button);
        $(this).hide();

    });


    $(".reveal-button").on("click", function () {
        $(this).next().slideToggle("fast").promise().done(function () {
            if ($(this).find(".line-matching")) {
                $(window).trigger('resize');
            }
        });
    });
});