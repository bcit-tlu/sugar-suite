/*globals jQuery: false */
(function ($) {
    var $knowledgeCheck = $(".knowledge-check, .self-test");
    var identifier = new Identifier();
    var markers = {
        correct: "<i class='correct'>✔</i>",
        incorrect: "<i class='incorrect'>❌</i>",
        actual: "<i class='actual'>➜</i>"
    };

    // :startsWith(@) — matches elements whose trimmed text starts with @.
    // jQuery 4 requires createPseudo for argument-taking pseudos.
    $.expr.pseudos.startsWith = $.expr.createPseudo(function (arg) {
        var re = new RegExp("^" + arg);
        return function (el) {
            return re.test(($(el).text() ?? "").trim());
        };
    });

    $knowledgeCheck.each(function () {
        var $questionList = $(this).children("ol,ul").last();
        $questionList.each(initQuestions);
    });

    // D2L friendly scrolling function
    function scrollTo($el) {
        var _$ = window.parent.jQuery || $;
        // var offset = $el.offset().top;
        // if (_$(".d2l-iframe").length) {
        //     offset += _$(".d2l-iframe").offset().top;
        //     offset -= _$(".d2l-minibar").height();
        // }

        _$('html, body').animate({
            scrollTop: $el.offset().top
        }, 500);

        $el.attr("tabindex", -1);
        $el.trigger("focus");
        $el.removeAttr("tabindex");
    }

    function initQuestions() {
        var $questionList = $(this);
        var kcNolistStyle = $questionList.parent().hasClass("no-list-style");
        var $questions = $questionList.children("li");
        var $allListItems = $questionList.find("li");
        var random = $questionList.is("ul");
        var questions = [];
        var isInit = true;

        $allListItems.each(wrapTextNodes);
        $questions.each(function () {
            var $question = $(this);
            var id = identifier.getID();
            questions.push(parseQuestion($question, id, kcNolistStyle));
            $question.remove();
        });

        createKnowledgeCheckForm($questionList, questions, random, isInit);

    }

    function createKnowledgeCheckForm($replaceable, questions, random, isInit) {
        var $form = $("<form>");
        var $resetButton = $("<button class='reset'>Try Again</button>");
        var $submitButton = buildSubmitButton();
        var questionCount = 0;
        var isSingleQuestion = questions.length === 1;
        var isMultiColumn2 = $replaceable.parent().hasClass("multicolumn-2");
        var isMultiColumn3 = $replaceable.parent().hasClass("multicolumn-3");

        if (isMultiColumn2) {
            $form.addClass("multicolumn-2");
        } else if (isMultiColumn3) {
            $form.addClass("multicolumn-3");
        }
        $resetButton.hide();

        if (random) {
            questions = questions.sort(randomize);
        }

        questions.map(function (question) {
            var type = question.type;
            if (isSingleQuestion && type !== "UNKNOWN") {
                $form.append(buildQuestion(question, questionCount));
            } else if (type !== null) {
                $form.append(buildQuestion(question, ++questionCount));
            }
        });
        var $first = $form.children().first();


        $form.append($submitButton);
        $form.append($resetButton);
        $replaceable.replaceWith($form);
        $form.on("submit", checkResults);
        $resetButton.on("click", function (e) {
            e.preventDefault();
            scrollTo($form.parent());
            // Answer is not required on reset
            isInit = false;
            createKnowledgeCheckForm($form, questions, random, isInit);
        });

        var isDevelopment = $form.closest(".knowledge-check, .self-test").is(".development");
        // Answer is required only if it's NOT on development mode or it's first created
        if (!isDevelopment && isInit) {
            $form.find("input, select").not("[type='checkbox']").prop("required", true);
        }


        function checkResults(e) {
            e.preventDefault();
            var $form = $(this);


            assessInputs();
            reassessment();
            addResetButton();
            scrollTo($form.parent());
            if (!$(this).closest(".no-score").length) {
                showScore();
            }
            showFeedback();

            function assessInputs() {
                $form.find("input, select").trigger("assess");
            }

            function showScore() {
                var numCorrect = $form.find(".correct").length;
                var numIncorrect = $form.find(".incorrect").length;
                var $score = $("<div class='score'><p>Score: " + numCorrect + "/" + (numCorrect + numIncorrect) + "</p></div>");
                $score.hide();
                $form.prepend($score);
                $score.slideDown();
                $score.trigger("focus");
            }

            function addResetButton() {
                var $submitButton = $form.find("input[type='submit']");
                var $resetButton = $form.find(".reset");

                $submitButton.hide();
                $resetButton.show();
            }


            function showFeedback() {
                $form.find("fieldset").trigger("feedback");
            }

            function reassessment() {
                $form.find(".options input").on("input change", function () {
                    $(this).closest(".options").find(".option-feedback").slideUp(function () {
                        $(this).remove();
                    });
                    $(this).closest(".options").find("input").trigger("assess");
                });

                $form.find("select, input[type='text']").on("input change", function () {
                    $(this).trigger("assess");
                });

                $form.find(".ordering input").on("input change click", function () {
                    $(this).closest(".ordering").find("input").trigger("assess");
                });
            }
        }
    }

    function buildSubmitButton() {
        // var srWarning = "<p class='sr-only'>By using the following submit button, your answers will be evaluated with feedback provided directly on the answers above.</p><p class='sr-only'>As a convenience, focus will move to the beginning of the test so that you can review the results in order.</p>";
        var submitButtonText = "Check";
        var $div = $("<div>");
        var $submitButton = $("<input>");

        $submitButton.attr("type", "submit");
        $submitButton.val(submitButtonText);

        $div.append($submitButton);
        return $div;
    }

    function buildQuestion(question, questionNumber) {
        var $fieldset = $("<fieldset>");
        if (question.value != null) {
            questionNumber = question.value;
        }
        var $legend = buildQuestionLegend(question, questionNumber);
        var feedback = question.feedback;
        var type = question.type;

        if (type === "UNKNOWN") {
            var $warning = $("<p class='error-warning'>").html("Something's not quite right with this question. Check the <a href='https://conversion-guide.ltc.bcit.ca/knowledge-check.html'>Conversion Guide - Knowledge Checks</a> section for formatting details.");
            $fieldset.append($legend, $warning);
            return $fieldset;
        }

        $fieldset.on("feedback", function () {
            if (feedback) {
                var $feedback = $("<div>");
                $feedback.addClass("feedback");
                $feedback.html(feedback);
                $feedback.hide();
                $(this).append($feedback);
                $feedback.slideDown();
            }
        });


        $fieldset.append($legend);

        if (type === "SINGLE" || type === "MULTI") {
            $fieldset.append(question.text);
            $fieldset.append(buildQuestionOptions(question));
        }

        if (type === "BLANKS") {
            buildQuestionBlanks(question, $fieldset);

        }

        if (type === "ORDER") {
            $fieldset.append(question.text);
            $fieldset.append(buildQuestionOrder(question));
        }

        if (type === "MATCH") {
            $fieldset.append(question.text);
            $fieldset.append(buildQuestionMatch(question));
        }

        return $fieldset;
    }

    function buildQuestionMatch(question) {
        var $oldiv = $("<div>");
        var $ol1 = $("<ol>");
        var $ol2 = $("<ol>");
        var pairs = question.pairs;
        var left = [];
        var right = [];
        var max;

        $oldiv.addClass("matchContainer");
        $ol1.addClass("matchAns");
        $ol2.addClass("matching");

        pairs.map(function (pair) {
            if (left.indexOf(pair[0]) === -1) {
                left.push(pair[0]);
            }
            if (right.indexOf(pair[1]) === -1) {
                right.push(pair[1]);
            }
        });

        left = left.sort(randomize);
        right = right.sort(randomize);
        max = left.length;

        while (left.length) {
            var $li = $("<li>");
            $li.html(left.shift());
            $ol1.append($li);
        }

        while (right.length) {
            buildListItem();

        }

        return $ol1.add($ol2);

        function buildListItem() {
            var $li = $("<li>");
            var $input = $("<input>");
            var $label = $("<label>");
            var value = right.shift();
            $input.attr("type", "number");
            $input.attr("max", max);
            $input.attr("min", 1);
            $label.append(value);
            $li.append($input, $label);
            $ol2.append($li);

            $input.on("assess", function () {
                var val = $(this).val();
                if (!val) {
                    return;
                }
                var html = $label.html();
                var userMatch = $ol1.children().eq(val - 1).html();
                var matchingPairs = pairs.filter(function (item) {
                    if (item[0] === userMatch) {
                        return true;
                    }
                    return false;
                });
                var fullMatch = matchingPairs.filter(function (item) {
                    if (item[1] === html) {
                        return true;
                    }
                    return false;
                });
                if (fullMatch.length === 1) {
                    $li.prepend(markers.correct);
                } else {
                    $li.prepend(markers.incorrect);
                }

            });
        }
    }

    function buildQuestionOrder(question) {
        var $ol = $("<ol>");
        var order = question.order;

        $ol.addClass("ordering");
        var randomized = order.slice().sort(randomize);
        randomized.map(function (item, index) {
            var $listItem = $("<li>");
            var $up = $("<input>");
            var $down = $("<input>");
            var $hidden = $("<input>");
            var $buttons = $("<span>");
            var $both = $up.add($down);
            $hidden.hide();
            $hidden.attr("type", "number");
            $hidden.attr("size", "1");
            $hidden.prop("disabled", true);
            $hidden.addClass("hidden");
            $hidden.val(index + 1);
            $hidden.attr("size", 1);
            $buttons.append($up, $hidden, $down);
            $buttons.addClass("buttons");
            $both.attr("type", "button");
            $up.val("▲");
            $down.val("▼");
            $up.on("click input change", function () {
                var $prev = $listItem.prev();
                var $both = $listItem.add($prev);
                var $hidden = $listItem.find(".hidden");
                var $prevHidden = $prev.find(".hidden");
                var olTop = $ol.offset().top;
                var prevTop = $prev.offset().top - olTop;
                var currTop = $listItem.offset().top - olTop;
                var delta = prevTop - currTop;
                $hidden.val(parseInt($hidden.val()) - 1);
                $prevHidden.val(parseInt($prevHidden.val()) + 1);
                $listItem.insertBefore($prev);
                fuckWitIt();
                $listItem.css({
                    top: -delta,
                    position: "relative"
                });
                $prev.css({
                    top: delta,
                    position: "relative"
                });
                var speed = 300;
                $both.animate({
                    top: 0
                }, speed, function () {
                    $up.trigger("focus");
                    fuckWitIt();
                    if ($up.is(":disabled")) {
                        $down.trigger("focus");
                    }
                });
            });
            $down.on("click input change", function () {
                var $next = $listItem.next();
                var $both = $listItem.add($next);
                var $hidden = $listItem.find(".hidden");
                var $nextHidden = $next.find(".hidden");
                var olTop = $ol.offset().top;
                var nextTop = $next.offset().top - olTop;
                var currTop = $listItem.offset().top - olTop;
                var delta = nextTop - currTop;
                $hidden.val(parseInt($hidden.val()) + 1);
                $nextHidden.val(parseInt($nextHidden.val()) - 1);
                $listItem.insertAfter($next);
                fuckWitIt();
                $listItem.css({
                    top: -delta,
                    position: "relative"
                });
                $next.css({
                    top: delta,
                    position: "relative"
                });
                var speed = 300;
                $both.animate({
                    top: 0
                }, speed, function () {
                    $down.trigger("focus");
                    if ($down.is(":disabled")) {
                        $up.trigger("focus");
                    }
                });
            });

            $hidden.on("assess", function () {
                $(this).parent(".buttons").prev(".correct, .incorrect").remove();
                var value = parseInt($(this).val());
                var expected = order.indexOf($listItem.text()) + 1;
                var $feedback;
                if (value === expected) {
                    $feedback = $(markers.correct);
                    $listItem.prepend($feedback);
                } else {
                    $feedback = $(markers.incorrect);
                    $listItem.prepend($feedback);
                }
            });

            $listItem.append($buttons);
            $listItem.append(item);
            $ol.append($listItem);
        });

        function fuckWitIt() {
            var $li = $ol.children();
            var $first = $li.first().find("input").first();
            var $second = $li.first().next().find("input").first();
            var $last = $li.last().find("input").last();
            var $secondLast = $li.last().prev().find("input").last();
            $first.prop("disabled", true);
            $second.prop("disabled", false);
            $last.prop("disabled", true);
            $secondLast.prop("disabled", false);
        }
        fuckWitIt();
        return $ol;
    }

    function buildQuestionBlanks(question, $fieldset) {
        var text = question.text;
        var blanks = question.blanks;
        var $text = $("<div>");

        blanks.map(function (blank, blankIndex) {
            let blankRegex = /^\[\s*(.+?)\s*\]$/;
            let matchBlank = blankRegex.exec(blank);
            let trimmedBlank = matchBlank[1].replace(/\s\s+/g, ' '); // replace whitespaces with a space
            text = text.replace(blank, "<span id='target-" + blankIndex + "'>" + trimmedBlank + "</span>");
        });
        $text.html(text);

        $fieldset.append($text);


        blanks.map(function (blank, blankIndex) {
            var $thisBlank = $text.find("#target-" + blankIndex);
            var delim = ",";
            var options = blank.slice(1, -1).split(delim);
            var correct = [];
            var incorrect = [];
            options.map(function (option) {
                var trimmed = (option ?? "").trim().replace(/\s\s+/g, ' ');
                var firstChar = trimmed.charAt(0);
                if (firstChar === "*") {
                    correct.push((trimmed.slice(1) ?? "").trim());
                } else {
                    incorrect.push(trimmed);
                }
            });

            var isOpenEnded = correct.length === 0;

            if (isOpenEnded) {
                buildOpenEnded();
            } else {
                buildDropdown();
            }

            function buildOpenEnded() {
                var $input = $("<input>");
                correct = incorrect;
                $input.attr("type", "text");
                $thisBlank.text("blank");
                $thisBlank.addClass("blank-open-ended");
                $input.data("correct", correct);
                $input.data("target", $thisBlank.attr("id"));
                $thisBlank.prop("contenteditable", true);

                $thisBlank.replaceWith($input);
                $input.css("width", 0);
                $input.on("input change", adjustTextInputWidth);

                function adjustTextInputWidth() {
                    var $span = $("<span>");
                    var val = $(this).val();
                    $span.text(val);
                    $span.css("display", "inline-block");
                    $(this).after($span);
                    var width = $span.width();
                    $span.remove();
                    $(this).css("width", width + 20);
                }

                $input.on("assess", function () {
                    let val = $(this).val();
                    let trimmedVal = (val ?? "").trim().replace(/\s\s+/g, ' '); // trim and remove whitespaces
                    $(this).attr("title", "Accepts: " + correct.join(", "));
                    $(this).prev(".correct, .incorrect").remove();
                    if (correct.indexOf(trimmedVal) >= 0) {
                        $(this).before(markers.correct);
                    } else {
                        $(this).before(markers.incorrect);
                    }
                });
            }

            function buildDropdown() {
                var $select = $("<select>");
                var combined = correct.concat(incorrect);
                $thisBlank.replaceWith($select);

                combined.sort(randomize).map(function (option) {
                    var $option = $("<option>");
                    $option.text(option);
                    $option.val(option);
                    $select.append($option);
                });

                $select.prepend("<option selected disabled>");
                $select.one("focus", function () {
                    $(this).children().first().remove();
                });

                $select.on("assess", function () {
                    $(this).attr("title", "Correct Option: " + correct[0]);
                    $(this).prev(".correct, .incorrect").remove();
                    if ($(this).val() === correct[0]) {
                        $(this).before(markers.correct);
                    } else {
                        $(this).before(markers.incorrect);
                    }
                });

            }
        });
    }

    function buildQuestionLegend(question, questionNumber) {
        var $legend = $("<legend>");
        if (questionNumber != 0) {
            $legend.append(questionNumber + ")");
        }

        return $legend;
    }

    function buildQuestionOptions(question) {
        var $optionsList = $("<ol>");
        var name = question.id;
        var options = question.options;
        if (question.random) {
            options = options.sort(randomize);
        }



        if (question.isNoListStyle) {
            $optionsList.addClass("options no-list-style");
        } else {
            $optionsList.addClass("options");
            options.forEach(function (option, index) {
                let optionEnum = String.fromCharCode(97 + index);
                var $pHtmlElement = $('<div>').html(option.html);
                var $pElement = $pHtmlElement.find('p').first();

                if (!question.isNoListStyle) {
                    if (!option.isEnum) {
                        if ($pElement.length > 0) {
                            $pElement.prepend(optionEnum + '. ');
                            option.html = $pHtmlElement.html();
                        } else {
                            option.html = optionEnum + '. ' + option.html;
                        }
                        option.isEnum = true;
                    } else {
                        // replace the previously added enum with the new one
                        if ($pElement.length > 0) {
                            $pElement.html(optionEnum + '. ' + $pElement.html().slice(3));
                            option.html = $pHtmlElement.html();
                        } else {
                            // replace the previously added enum with the new one
                            option.html = optionEnum + '. ' + option.html.slice(3);
                        }
                    }
                }
            });
        }
        var formated = options.map(buildOptionListItem);
        $optionsList.append(formated);

        return $optionsList;

        function buildOptionListItem(option, index) {
            // requires access to name and correct variables
            var id = name + "-" + index;
            var $li = $("<li>");
            var $label = $("<label>");
            var $input = $("<input>");

            $li.on("show-feedback", function () {
                var $feedback = $("<div>");
                if (option.feedback) {
                    $feedback.addClass("option-feedback");
                    $feedback.append(option.feedback);
                    $feedback.hide();
                    $li.append($feedback);
                    $feedback.slideDown();
                }
            });

            $label.append(option.html);
            $input.data("correct", option.correct);

            applyAttributes();
            applyHighlights();
            applyInputType();

            $input.on("assess", assessInput);

            $li.append($input, $label);

            return $li;

            function applyAttributes() {
                $label.attr("for", id);
                $input.attr("id", id);
                $input.attr("name", name);
            }

            function applyHighlights() {
                $input.on("mouseenter focus mouseleave blur", handleHoverHighlights);
                $label.on("mouseleave", removeHover);
                $input.on("input change", handleSelections);

                function handleHoverHighlights(e) {
                    var $label = $("label[for='" + $(this).attr("id") + "']");
                    var isIncoming = e.type === "mouseenter" || e.type === "focus";
                    if (isIncoming) {
                        $label.addClass("hover");
                    } else {
                        $label.removeClass("hover");
                    }
                }

                function removeHover() {
                    $(this).removeClass("hover");
                }

                function handleSelections() {
                    var $label = $("label[for='" + $(this).attr("id") + "']");
                    var isSelected = $(this).is(":checked");
                    var isRadioSelected = isSelected && $(this).is("[type='radio']");
                    var $selected = $(this).closest("ol").find("label.selected");

                    if (isRadioSelected) {
                        $selected.removeClass("selected");
                        $label.addClass("selected");
                    } else if (isSelected) {
                        $label.addClass("selected");
                    } else if (!isSelected) {
                        $label.removeClass("selected");
                    }
                }
            }


            function applyInputType() {
                var questionType = question.type;

                if (questionType === "SINGLE") {
                    $input.attr("type", "radio");
                } else if (questionType === "MULTI") {
                    $input.attr("type", "checkbox");
                }
            }

            function assessInput() {
                $(this).siblings(".correct, .incorrect, .actual, .option-feedback").remove();
                var isCorrect = $input.data("correct");
                var isChecked = $input.is(":checked");
                var isRadio = $input.attr("type") === "radio";
                var isCheckbox = !isRadio;

                if (isRadio) {
                    if (isChecked) {
                        $li.trigger("show-feedback");
                        if (isCorrect) {
                            $input.before(markers.correct);
                        }
                        if (!isCorrect) {
                            $input.before(markers.incorrect);
                        }
                    }
                    if (!isChecked) {
                        if (isCorrect) {
                            //$input.before(markers.actual);
                        }
                    }
                }

                if (isCheckbox) {
                    if (isChecked) {
                        $li.trigger("show-feedback");
                        if (isCorrect) {
                            $input.before(markers.correct);
                        }
                        if (!isCorrect) {
                            $input.before(markers.incorrect);
                        }
                    }
                    if (!isChecked) {
                        if (!isCorrect) {
                            $input.before(markers.correct);
                        }
                        if (isCorrect) {
                            $input.before(markers.incorrect);
                        }
                    }
                }
            }
        }
    }

    function parseQuestion($question, id, isNoListStyle) {
        var self = this;
        var data = {
            id: id,
            type: "",
            text: "",
            order: [],
            random: false,
            isNoListStyle: isNoListStyle,
            options: [],
            feedback: "",
            blanks: [],
            value: $question.attr("value"),
        };

        function itStartsWith(string, character) {
            var firstChar = (string ?? "").trim().charAt(0);
            return firstChar === character;
        }

        function removeCharacter(string, char) {
            var index = string.indexOf(char);
            var str = string.slice(0, index) + string.slice(index + 1);
            return (str ?? "").trim();
        }

        function init() {
            parseType();

            if (data.type === "SINGLE" || data.type === "MULTI") {
                parseOptionList();
            }

            if (data.type === "ORDER") {
                parseOrder();
            }

            if (data.type === "MATCH") {
                parseMatchingPairs();
            }

            parseGeneralFeedback();
            parseText();

            if (data.type === "BLANKS") {
                data.blanks = parseBlanks();
            }

        }

        function parseMatchingPairs() {
            var $lastList = $question.children("ol,ul").last();
            var $lastTable = $question.children("table").last();
            var pairs = [];

            if ($lastList.length) {
                if (isMatching($lastList.children("li"))) {
                    var $pairs = $lastList.children("li");
                    $pairs.each(function () {
                        var text = $(this).text();
                        var pair = text.split("=");
                        pairs.push([(pair.shift() ?? "").trim(), pair.join("=").trim()]);
                    });
                    $lastList.remove();
                    data.pairs = pairs;
                    return;
                }
            }

            if ($lastTable.length) {
                var $rows = $lastTable.find("tr");
                $rows.each(function () {
                    var $td = $(this).find("td");
                    var $th = $(this).find("th");
                    if ($td.length === 2) {
                        pairs.push([$td.first().html(), $td.last().html()]);
                        return;
                    }
                    if ($td.length === 1 && $th.length === 1) {
                        pairs.push([$th.html(), $td.html()]);
                        return;
                    }
                });
                $lastTable.remove();
                data.pairs = pairs;
                return;
            }

            data.type = "UNKNOWN";
        }

        function parseOrder() {
            var $orderedList = $question.children("ol,ul").last();
            var $orderedListItems = $orderedList.children("li");
            var order = [];
            $orderedListItems.each(function () {
                order.push($(this).text());
            });
            data.order = order;
            $orderedList.remove();
            return;
        }

        function parseType() {
            var $p = $question.children("p:contains('Type:'), p:contains('type:')");
            var $options = $question.children("ol,ul").last().children("li");

            if ($p.length === 1) {
                $p.each(function () {
                    var text = $(this).text().toLowerCase().trim();
                    if (text.indexOf("type:") === 0) {
                        var type = text.slice("type:".length).trim();
                        switch (type) {
                            case "order":
                                data.type = "ORDER";
                                $(this).remove();
                                break;
                            case "match":
                                data.type = "MATCH";
                                $(this).remove();
                                break;
                            case "single":
                                data.type = "SINGLE";
                                $(this).remove();
                                break;
                            case "multi":
                                data.type = "MULTI";
                                $(this).remove();
                                break;
                        }
                    }
                });
                if (data.type) {
                    return;
                }
            }

            if (isMatching($options)) {
                data.type = "MATCH";
                return;
            }

            if ($options.length) {
                var correctOptions = 0;
                $options.each(function () {
                    if (itStartsWith($(this).text(), "*")) {
                        correctOptions++;
                    }
                });

                if (correctOptions === 1) {
                    data.type = "SINGLE";
                    return;
                }

                if (correctOptions > 1) {
                    data.type = "MULTI";
                    return;
                }

                if (correctOptions == 0) {
                    data.type = "ORDER";
                    return;
                }
            }

            if ($question.text().split("").indexOf("[") !== -1) {
                data.type = "BLANKS";
                return;
            }

            data.type = "UNKNOWN";
        }

        function isMatching($listItems) {
            if (!$listItems.length) {
                return false;
            }

            var isMatching = true;
            $listItems.each(function () {
                if (isMatching && $(this).text().indexOf("=") !== -1) {
                    return;
                }
                isMatching = false;
                return false;
            });

            return isMatching;
        }


        function parseGeneralFeedback() {
            var $feedback = $("<div>");
            var $start = $question.children(":startsWith(@)");
            var hasFeedback = $start.length;
            if (hasFeedback) {
                $feedback.append($start, $start.nextAll());
                $start.html(removeCharacter($start.html(), "@"));
                data.feedback = $feedback.html();
                $feedback.remove();
            }
        }

        function parseOptionList() {
            var $optionsList = $question.children("ol,ul").last();
            var isNoListStyle = $optionsList.hasClass("no-list-style");
            data.isNoListStyle = data.isNoListStyle || isNoListStyle;
            var $options = $optionsList.children("li");
            var options = [];

            $options.each(function () {
                var option = {};
                var $feedback = $("<div>");
                var $start = $(this).children(":startsWith(@)");
                var hasFeedback = $start.length;

                if (hasFeedback) {
                    $feedback.append($start, $start.nextAll());
                    $start.html(removeCharacter($start.html(), "@"));
                    option.feedback = $feedback.html();
                    $feedback.remove();
                }

                var pHtml = $(this).html();
                if (itStartsWith($(this).text(), "*")) {
                    pHtml = removeCharacter(pHtml, "*");
                    option.correct = true;
                } else {
                    option.correct = false;
                }

                option.html = pHtml;
                options.push(option);
            });

            data.random = $optionsList.is("ul");
            data.options = options;

            $optionsList.remove();
        }

        function parseText() {
            var $remains = $("<div>");

            $question.contents().each(function () {
                $remains.append($(this).clone());
            });
            data.text = ($remains.html() ?? "").trim();
        }

        function parseBlanks() {
            var re = /\[.+?\]/g;
            var matches = data.text.match(re);
            return matches;
        }


        init();

        return data;

    }

    function Identifier() {
        var counter = 0;

        this.getID = function () {
            return "id" + Math.random().toFixed(5) + "-" + counter++;
        };
    }


    function randomize(a, b) {
        if (Math.random() > 0.5) {
            return -1;
        }
        return 1;
    }

    function wrapTextNodes() {
        var $contents = $(this).contents();
        var selection = [];
        var inlineTags = [
            "SPAN",
            "I",
            "B",
            "EM",
            "STRONG",
            "SUB",
            "SUP"
        ];

        $contents.each(function () {
            if (this.nodeType === 3 && $(this).text().trim()) {
                selection.push($(this));
            } else if (inlineTags.indexOf(this.tagName) !== -1) {
                selection.push($(this));
            } else if ($(this).is("br")) {
                $(this).remove();
                wrapSelection();
            } else {
                wrapSelection();
            }
        });

        wrapSelection();

        function wrapSelection() {
            if (selection.length) {
                var $p = $("<p>");
                selection[0].before($p);
                selection.forEach(function ($item) {
                    $p.append($item);
                });
                selection = [];
            }
        }
    }

}(jQuery));