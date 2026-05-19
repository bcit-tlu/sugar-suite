(function ($) {

    // "globals"
    var isClicked = false; // check if the question matching-item is clicked/active
    var answerSequence = []; // Sequence of the clicked matching-item

    // a struct used to simply store the jquery objects represeting the question and answers pairing
    class MatchingQuestion {
        constructor(question, answer) {
            this.question = $(`<div class="matching-item-contents">${question}</div>`); // First row
            this.answers = [$(`<div class="matching-item-contents">${answer}</div>`)]; // array of possible answers
        }
    }

    // the class to represet this whole interaction.
    class MatchingObject {
        constructor($matching) {
            this.className = $matching.attr("class"); // line-matching ,drag&drop, etc
            this.isLeftOrder = $matching.hasClass("left-order");
            this.$table = $matching.find("figure.table"); // table with the data
            this.$thead = this.$table.find("thead"); // header in case instructor wants a title
            var $tbody = this.$table.find("tbody"); // questions and answers
            this.$title = this.$thead.find("tr > th:first"); // question title
            this.$answers = this.$thead.find("tr > th:not(:first)"); // answer title
            this.isMoreThanOne = this.$answers.length > 1 ? true : false; // check if there's more than 2 column
            var $tr = $tbody.find("tr");
            let tempQuestionObj = [];

            // extract data from table row and create an object for each question
            $tr.each(function () {
                let q = "";
                let a = "";
                $(this).children("td").each(function (index) {
                    $(this).contents().filter(function () {
                        if ($(this).text().trim().length > 0) {
                            return this.nodeType === Node.TEXT_NODE;
                        }
                    }).wrap("<div style='color:white';></div>");

                    if (index == 0) { //question
                        q = $(this).html();
                    } else { // answer
                        a = $(this).html();
                    }

                });

                // we try to find out if the current question matches an existing "MatchingQuestion"
                // if it does, we add that answer to the original to create one to many answers
                const foundIndex = tempQuestionObj.findIndex(matchingQuestion => {
                    return matchingQuestion.question.html().toLowerCase() === q.toLowerCase();
                });

                if (foundIndex > -1) {
                    tempQuestionObj[foundIndex].answers.push($(`<div class="matching-item-contents">${a}</div>`));
                    // use data to determine how many answers a question has (it's basically a stack number);
                    // "remainingAnswers" is used for incrementing / decrementing
                    if (tempQuestionObj[foundIndex].question.data("remainingAnswersDefault")) {
                        tempQuestionObj[foundIndex].question.data("remainingAnswersDefault", parseInt(tempQuestionObj[foundIndex].question.data("remainingAnswersDefault")) + 1);
                    } else {
                        tempQuestionObj[foundIndex].question.data("remainingAnswersDefault", 2); // 2 since by now we have the oringal first and now a second stacked on it.
                    }
                    tempQuestionObj[foundIndex].answers[tempQuestionObj[foundIndex].answers.length - 1].data("myQuestion", tempQuestionObj[foundIndex].question);
                } else {
                    tempQuestionObj.push(new MatchingQuestion(q, a));
                    tempQuestionObj[tempQuestionObj.length - 1].answers[0].data("myQuestion", tempQuestionObj[tempQuestionObj.length - 1].question);
                }

            });

            // once we have set up our tempQuestionObj, ensure all of our questions have a proper answer stack, if present.
            tempQuestionObj.forEach(obj => {
                if (obj.question.data("remainingAnswersDefault")) {
                    obj.question.data("remainingAnswers", obj.question.data("remainingAnswersDefault"));
                }
            });

            this.questionObj = tempQuestionObj;
        }
    }


    var myWindow = window;
    if (window.self !== window.top) {
        myWindow = parent.window;
    }
    let isMobile = $(myWindow).width() < 780; // to determine if we need to hide the line in line-matching
    $(window).on("load", function () {
        $(".line-matching").each(initLineMatching);
    });

    /*
    $(".line-matching").each(initLineMatching).promise().done(function () {
         if (window.self !== window.top) {
            resizeDiv(); // d2l iframe
        } 
    });
    */

    // process all .line-matching setups
    function initLineMatching() {
        var $matching = $(this); // this paticular line matching interaction in the dom
        var matchingObj = new MatchingObject($matching); // read the table and create the "matching object"

        // create some arrays to temporarily contain our questions and answers
        let questionsArray = [];
        let answersArray = [];

        const matchingItemWrapper = `<div class="matching-item" tabindex=0>`;

        matchingObj.questionObj.forEach((qArray, i) => {
            const questionElement = $(matchingItemWrapper).append(qArray.question);
            questionsArray.push(questionElement);

            qArray.answers.forEach((answer, j) => {
                const answerElement = $(matchingItemWrapper).append(answer);
                answersArray.push(answerElement);
            });
        });

        matchingObj.$table.hide(); // hide original table

        var $matchingContainer = $("<div class='line-matching-container'>");

        // wrap up all questions into a div
        let $questionsDiv = $("<div>"); // wrapper for all the question matching items
        questionsArray.forEach(function (question, index) {
            // if this question has multiple answers, we need to create multiple lines for it.
            let multiAnswerCount = question.find(".matching-item-contents").data("remainingAnswers");
            if (!Number.isInteger(multiAnswerCount)) multiAnswerCount = 1;
            for (let i = multiAnswerCount; i > 0; i--) {
                question.append($("<div class='connector-line'>"));
                $questionsDiv.append(question);
            }
        });
        $matchingContainer.append($questionsDiv);

        // do the same for answers, wrapping them up in a div too
        const wrapperDiv = $("<div>");
        answersArray.forEach(answer => wrapperDiv.append(answer));

        // put all these together into the dom
        $matchingContainer.append(wrapperDiv);
        $matchingContainer.insertAfter($matching.find(".table"));

        if (matchingObj.$title.length && matchingObj.$answers.length) {
            // Get table header
            let $headerContainer = $("<div class='line-matching-header'>");
            $headerContainer.append($("<h3>").text(matchingObj.$title.text()));
            matchingObj.$answers.each(function () {
                $headerContainer.append($("<h3>").text($(this).text()));
            });
            $headerContainer.insertAfter($matching.find(".table"));
        }

        // shuffle the order of elements
        var divToShuffle = matchingObj.isLeftOrder ? "div:last" : "div";
        $matchingContainer.children(divToShuffle).each(function (i, container) {
            shuffleContainer($(container));
        });

        // set .connector-line position based on its parent
        $matching.find(".connector-line").each(function () {
            let $connectorLine = $(this);
            let $matchingItem = $connectorLine.parent();
            let left = $matchingItem.outerWidth() - 2;
            let top = $matchingItem.outerHeight() / 2;
            $connectorLine.css({
                "left": left + "px",
                "top": top + "px"
            });
        });

        // If clicked happened inside line-matching but not .matching-item then remove active connector-line
        $matching.find(".line-matching-container").on("click keyup", selectMatchingItem);

        // bind click event on all matching items (questions and answers, when to draw the lines, etc)
        $matching.find(".matching-item").on("click keyup", function (e) {
            matchingClickEvent(e, $(this), matchingObj);
        });

        // the "drawing" of the line, while we have one.
        $matching.on("mousemove", function (event) {
            var offset = $(this).find(".line-matching-container").offset();
            if (isClicked) {
                let $line = $(this).find(".connector-line.selected");
                if (isMobile) {
                    $line.addClass("hide");
                } else {
                    $line.removeClass("hide");
                }
                if ($line.length) {
                    if (parseFloat($line.css("top")) <= 0 || parseFloat($line.css("left")) <= 0) {
                        recalculateLine();
                    }

                    let offsetX = event.pageX - $line.offset().left + $line.parent().position().left;
                    let offsetY = event.pageY - offset.top - ($line.parent()[0].offsetTop + ($line.parent().outerHeight() / 2));
                    setLine($line, offsetX, offsetY);
                }
            }
        });

        // Reset matching
        let $resetButton = $("<button type='button'>").addClass("reset btn").text("Reset");
        $resetButton.insertAfter($matchingContainer);

        $resetButton.on("click", function () {
            $matching.find(".matching-item").each(function () {
                if ($(this).hasClass("overText")) {
                    $(this).attr('class', 'matching-item overText');
                } else {
                    $(this).attr('class', 'matching-item');
                }
            });

            $matching.find(".connector-line").attr('class', 'connector-line').css("height", "0px");
            answerSequence = [];
            isClicked = false;

            $matching.find(".matching-item-contents").each(function (i, contents) {
                if (typeof $(this).data("remainingAnswers") !== "undefined") {
                    $(this).data("remainingAnswers", $(this).data("remainingAnswersDefault"));
                }
            });
        });
    }

    function selectMatchingItem(event) {
        if (event.type === "click" || event.keyCode === 13) {
            if (event.target === this && $(this).find(".selected").length) {
                let $line = $(this).find(".selected");

                $line.parent().removeClass(function (index, className) {
                    return (className.match(/clicked-item-[0-9]{1,}/g) || []).join(' ');
                });
                $line.removeClass("selected " + function (index, className) {
                    return (className.match(/line-[0-9]{1,}/g) || []).join(' ');
                }).height("0");
                answerSequence.splice(-1, 1);
                return;
            }

        }
    }


    var prevWidth = $(myWindow).width();

    $(myWindow).on("resize", function () {
        if ($(".line-matching").length) {
            recalculateLine();
            //resizeDiv();
        }

    });

    /*     function resizeDiv() {
            $(".line-matching").find(".matching-item").each(function () {
                let $matchingItem = $(this);
                if (prevWidth < $(myWindow).width()) {
                    normalizeSize($matchingItem);
                } else {
                    decreaseFontSize($matchingItem);
                }
    
            });
            prevWidth = $(myWindow).width();
        }
    
        function normalizeSize($matchingItem) {
            $matchingItem.children().each(function () {
                $(this).css("font-size", "initial");
                if ($(this).is("figure, img, video")) {
                    if ($(this).is("figure")) {
                        $(this).children("img, video").css("height", "initial");
                        if ($(this).find(".video-wrapper").length) {
                            $(this).css("width", "initial");
                        }
                    } else {
                        $(this).css("height", "initial");
                    }
                }
            }).promise().done(function () {
                decreaseFontSize($matchingItem);
            });
        }
    
        // TODO: fix with the new container element within each matching item
        function decreaseFontSize($matchingItem) {
            let isOverflow;
            let childsHeight = 0;
            $matchingItem.children().not(".connector-line").each(function () {
                childsHeight += $(this).height();
            });
            $matchingItem.children().not(".connector-line").each(function () {
                isOverflow = childsHeight > 132;
                if (isOverflow) {
                    if ($(this).is("figure, img, video, audio")) {
                        if ($(this).is("figure")) {
                            let newSize = parseInt($(this).children("img, video").height()) - 20;
                            $(this).children("img, video").css("height", newSize + "px");
                            if ($(this).find(".video-wrapper").length) {
                                $(this).css("width", parseInt($(this).width()) - 20);
                            }
                        } else {
                            let newSize = parseInt($(this).height()) - 20;
                            $(this).css("height", newSize + "px");
                        }
                    }
                    let newFontSize = parseInt($(this).css("font-size")) - 0.5;
                    if (newFontSize >= 3) {
                        $(this).css("font-size", newFontSize + "px");
                    }
    
                    childsHeight = 0;
                    $matchingItem.children().not(".connector-line").each(function () {
                        childsHeight += $(this).height();
                    });
    
                    if (childsHeight > 132) {
                        isOverflow = true;
                    } else {
                        isOverflow = false;
                    }
                }
            });
            if (isOverflow) {
                //decreaseFontSize($matchingItem);
                // TODO: find out why we're repeatedly "overflowing"
            }
        } */

    function recalculateLine() {
        isMobile = $(myWindow).outerWidth() < 780;

        let $connectorLine = $(".line-matching .connector-line");

        $connectorLine.each(function () {
            let $line = $(this);
            let $matchingItem = $line.parent();
            let left = $matchingItem.outerWidth() - 2;
            let top = $matchingItem.outerHeight() / 2;
            $line.css({
                "left": left + "px",
                "top": top + "px"
            });
        });

        let $matching = $(".line-matching");
        let $lines = $matching.find(".connector-line.done");

        if (isMobile) {
            $lines.addClass("hide");
        } else {
            $lines.removeClass("hide");
        }

        $lines.each(function () {
            let $line = $(this);
            var offset = $line.closest(".line-matching-container").offset();
            let classNum = $line.attr("class").match(/line-[0-9]{1,}/g)[0].split('-')[1];
            let $from = $line.parent();
            let $to = $from.parent().next().find(".clicked-item-" + classNum);
            let $prevLines = $line.prevAll('.line-' + classNum);

            if ($prevLines.length > 0) {
                // If line is one to many
                $to = $to.eq($prevLines.length);
            } else {
                // If line is one to one or only one of the answers is clicked
                $to = $to.eq(0);
            }

            let answerPosition = $to.offset();
            let offsetX = answerPosition.left - $line.offset().left + $line.parent().position().left;
            let offsetY = answerPosition.top - offset.top - ($line.parent()[0].offsetTop + ($line.parent().outerHeight() / 2)) + ($to.outerHeight() / 2);
            setLine($line, offsetX, offsetY);
        });
    }


    function resetSelection($clickedMatchingItem, classNum) {
        classNum = parseInt(classNum);
        let $line = $clickedMatchingItem.closest(".line-matching-container").find(".selected");
        let $item1 = null;
        let $item2 = null;
        if ($line.length) {
            $item1 = $line.parent();
            $item2 = $clickedMatchingItem;
            $line.removeClass("selected done line-" + classNum).height("0");
        } else {
            let $selectedItems = $clickedMatchingItem.closest(".line-matching-container").find(".clicked-item-" + classNum);
            $item1 = $($selectedItems[0]);
            $item2 = $($selectedItems[1]);
        }

        $item1.removeClass(function (i, className) {
            return (className.match(/clicked-item-[0-9]+/g) || []).join(' ');
        });

        // if this is an already answered multi-answer, leave its class
        if (typeof $item2.find("matching-item-contents").data("myQuestion") !== "undefined") {
            $item2.removeClass(function (i, className) {
                return (className.match(/clicked-item-[0-9]+/g) || []).join(' ');
            });
        }

    }

    function setLine($connectorLine, offsetX, offsetY) {
        let fromPosition = $connectorLine.parent().position();
        let angle = 0;
        let length = Math.sqrt(Math.pow(offsetX - fromPosition.left, 2) + Math.pow(offsetY, 2));

        if (offsetX > fromPosition.left) {
            angle = -180 / Math.PI * Math.acos((offsetY) / length);
            $connectorLine.css({
                "transform": "rotate(" + angle + "deg)",
                "height": length + "px"
            });
        }
    }

    // take in the question / answer pair, and determine if they are correct.
    // returns an array for potential future evaluation features, like multiple matches at once.
    function checkAnswers(answerSequence) {
        if (answerSequence[0].find(".matching-item-contents").html() === answerSequence[1].find(".matching-item-contents").data("myQuestion").html()) {
            return [true];
        }
        return [false];
    }

    // the click event function to determine what happens to each matching item, each time we click on them.
    function matchingClickEvent(clickEvent, clickObject, matchingObject) {
        if (clickEvent.type === "click" || clickEvent.keyCode === 13) {
            // if object already have a match, return
            if (clickObject.is('[class*=clicked-item-]')) {
                return;
            }

            var offset = clickObject.closest(".line-matching-container").offset(); // starting line offset
            let $matchingDiv = clickObject.closest(".line-matching-container");

            const classNum = $matchingDiv.children("div").eq(1).find("[class*='clicked-item-']").length + 1; // used for the "clicked" css classes
            const myColumn = clickObject.parent().index(); // future proofing index used to determine line matching "column"

            // in case the line-connector got clicked instead on matching-item
            if (clickEvent.target !== this && $(this).find(".selected").length) {
                $matchingDiv.trigger("click");
                return;
            }

            // if we click the "clicked" item again, remove the active line for matching
            if (clickObject.attr("class").indexOf('clicked-item-') != -1 && clickObject.parent().is($matchingDiv.children("div").eq(0)) && answerSequence[0][0] === clickObject[0]) {

                // determine the correct number to use for "class number"
                const currentClassNumber = findAnswerClass($matchingDiv, clickObject);

                let isLastCheckedItem = answerSequence[answerSequence.length - 1][0] === clickObject[0];
                isClicked = false;

                let $clickedItems = $matchingDiv.find(".clicked-item-" + classNum);
                let clickedItemsLength = $clickedItems.length;
                if (clickedItemsLength > 1) {
                    return;
                }

                answerSequence.splice(-1, 1);

                let $line = clickObject.closest(".line-matching-container").find(".line-" + classNum);
                $line.removeClass("selected done line-" + classNum).height("0");
                clickObject.removeClass(function (i, className) {
                    return (className.match(/clicked-item-[0-9]+/g) || []).join(' ');
                });
                return;

                // else, we are not clicking ourselves
            } else {
                // if we errantly click another question, reset the click sequence
                if (clickObject.parent().is($matchingDiv.children("div").eq(0)) && answerSequence.length > 0) {
                    isClicked = false;
                    resetSelection(clickObject, classNum);
                    // ensure we are cleared on reset
                    //clickObject.removeClass("[class*='clicked-item-']");
                    answerSequence = [];
                    return;
                }

                // if we are a question with multiple answers, make sure we use the correct class number
                const currentClassNumber = findAnswerClass($matchingDiv, clickObject);

                // here we determine if we're going to be "clicked" and make the line
                if (clickObject.parent().is($matchingDiv.children("div").eq(0)) && !clickObject.hasClass("[class*='clicked-item-']")) {
                    isClicked = true;

                    // determine which colour to use for the drawn lineClass
                    const lineClass = currentClassNumber > 0 ? `selected line-${currentClassNumber}` : `selected line-${classNum}`;
                    clickObject.find(".connector-line").not(".done").first().addClass(lineClass);

                    // since we have been "clicked", add the status and create the answer sequence

                    if (clickObject.find(".matching-item-contents").data("remainingAnswers") && currentClassNumber > 0) {
                        clickObject.addClass(`clicked-item-${currentClassNumber}`);
                    } else {
                        clickObject.addClass("clicked-item-" + classNum);
                    }

                    answerSequence.push(clickObject);
                }

            }

            // here we check if we're now going to click on an answer while "clicked" and see if we're correct with our matching
            if (answerSequence.length > 0 && clickObject.parent().is($matchingDiv.children("div").eq(1))) {

                // determine the correct number to use for "class number"
                const currentClassNumber = findAnswerClass($matchingDiv, answerSequence[0]);

                // if our answer is already answered (has the clicked item class), reset the selection / line matching
                if (clickObject.attr("class").indexOf('clicked-item-') != -1) {
                    isClicked = false;
                    if (currentClassNumber > 0) {
                        resetSelection(clickObject, currentClassNumber);
                    } else {
                        resetSelection(clickObject, classNum);
                    }
                    answerSequence = [];
                    return;
                }

                // we are now clicking on an answer so add that to the sequence now for evaluation
                answerSequence.push(clickObject);

                let answerEvaluations = checkAnswers(answerSequence);

                answerEvaluations.forEach(function (answer, index) {
                    if (!answer) { // not the answer, reset the sequence
                        answerSequence.splice(-myColumn, myColumn);
                        isClicked = false;
                        if (currentClassNumber > 0) {
                            resetSelection(clickObject, currentClassNumber);
                        } else {
                            resetSelection(clickObject, classNum);
                        }
                    } else { // this is the answer, "connect" the line

                        let $line = $matchingDiv.find(".selected");
                        let answerPosition = clickObject.offset();
                        let offsetX = answerPosition.left - $line.offset().left + $line.parent().position().left;
                        let offsetY = answerPosition.top - offset.top - ($line.parent()[0].offsetTop + ($line.parent().outerHeight() / 2)) + (clickObject.outerHeight() / 2);
                        if (isMobile) {
                            $line.addClass("hide");
                        } else {
                            $line.removeClass("hide");
                        }
                        setLine($line, offsetX, offsetY);

                        // finalize the line
                        isClicked = false;
                        $matchingDiv.find(".connector-line.selected").removeClass("selected").addClass("done");

                        // use the question tally to determine if this question is done, or still has more answers.
                        if (answerSequence[0].find(".matching-item-contents").data("remainingAnswers")) {

                            // determine the class to use for the answers
                            const currentClass = currentClassNumber > 0 ? `clicked-item-${currentClassNumber}` : `clicked-item-${classNum}`;
                            clickObject.addClass(currentClass);

                            answerSequence[0].find(".matching-item-contents").data("remainingAnswers", parseInt(answerSequence[0].find(".matching-item-contents").data("remainingAnswers")) - 1);
                            if (answerSequence[0].find(".matching-item-contents").data("remainingAnswers") < 1) {
                                answerSequence[0].addClass(currentClass);
                            } else {
                                answerSequence[0].removeClass(currentClass);
                            }

                        } else { // simply use the current clicked item class
                            clickObject.addClass("clicked-item-" + classNum);
                        }

                    }
                });

                answerSequence = []; // clearing the sequence after getting answers
            }
        }
    }

    // shuffle the given jquery's children
    function shuffleContainer(container) {
        let array = container[0];
        for (let i = array.children.length; i >= 0; i--) {
            array.appendChild(array.children[Math.random() * i | 0]);
        }
    }

    // return the lowest "clicked-item-x" class of a group of answers (from a many to one group)
    function findAnswerClass(matchingDiv, matchingQuestion) {
        let lowestClassNumber = 0;

        matchingDiv.children().eq(1).find("[class*='clicked-item-']").each(function (i, content) {
            if ($(this).find(".matching-item-contents").data("myQuestion").is(matchingQuestion.find(".matching-item-contents"))) {
                const classNumber = $(this).attr("class").match(/\d+/)[0];
                if (lowestClassNumber === 0 || classNumber < lowestClassNumber) lowestClassNumber = classNumber;
            }
        });

        return lowestClassNumber;

    }

}(jQuery));