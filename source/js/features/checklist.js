(function ($) {
    // Get the page url location
    var pageName = window.location.href.replace(/\W+/g, '-');

    var checklistNumber = 0; // Number of checklist class in a page, e.g.: url-(1)
    
    $(".checklist").each(initChecklist);

    function initChecklist() {
        var $checklist = $(this);
        var $form = $("<form>");
        var $label = $("<label>");
        var $input = '<input type="checkbox">';
        var listNumber = 0;
        $checklist.wrapInner($form); //Wrap the inside of div with form

        checklistNumber++;
        var checklistId = pageName + "-" + checklistNumber;
        $checklist.attr('id', checklistId); // Add an id for every checklist
        var $li = $checklist.find("li");
        listFormatChecker($li);
        checkShowAfter($checklist);
        $li = $checklist.find("li");
        $checklist.find("ul, ol").each(addIdToList);
        $li.each(processLi).promise().done(function () {
            var $checkbox = $checklist.find("input[type=checkbox]");
            $checkbox.each(checkSiblings);
            $checkbox.on("change", checkboxChecker);
            $li.find("label").on("click", handleLabel);
        });
        //addResetButton($checklist);


        function listFormatChecker(_$li) {
            // Wrap the first and last text inside <li> if isn't wrapped with an element
            _$li.each(function() {
                var firstContent = $($(this).contents().first());
                if(firstContent[0].nodeType === 3 && (firstContent[0].nodeValue ?? "").trim().length != 0) {
                    firstContent.wrap("<p>");
                }
                var lastContent = $($(this).contents().last());
                if(lastContent[0].nodeType === 3 && (lastContent[0].nodeValue ?? "").trim().length != 0) {
                    lastContent.wrap("<p>");
                }
            });
        }

        function checkShowAfter(_$checklist) {
            // Find @ symbol
            var showAfter = _$checklist.find(':contains("@")');
            showAfter.each(function() {
                // if @ symbol is in the beginning of a text, add those and the next siblings to a new list
                if (this.innerHTML.match(/^@/)) {
                    $(this).parent("li").addClass("show-after");    
                    var $ul = $("<ul>");
                    var $li = $("<li>");
                    $ul.append($li);
                    
                    var fullLiContent = $(this).siblings().addBack();
                    var contentToShow = fullLiContent.slice($(this).index(), fullLiContent.length).clone();
                    contentToShow[0].innerHTML = contentToShow[0].innerHTML.trim().replace(/^@/, "");
                    if(contentToShow[0].innerHTML === "") { // If no text after @, remove <p>
                        contentToShow.splice(0,1);
                    }
                    $li.append(contentToShow);
                    $("<div class='temp'>").insertBefore($(this));
                    $(this).nextAll().addBack().remove();
                    $("div.temp").append($ul);
                    $ul.unwrap();
                }
            });
        }

        // Add an id for unordered and ordered list
        function addIdToList() {
            listNumber++;
            var listId = $(this).closest(".checklist").attr("id") + "-" + listNumber;
            $(this).attr('id', listId);
        }

        // Add an id for every list in a page and set the checkbox checked attribute
        function processLi() {
            var $li = $(this);
            var listId = $li.parent().attr("id"); // e.g.: url-1-(1)
            var liIndex = $li.index() + 1; // url-1-1-(1)
            var checklistId = listId + "-" + liIndex; // e.g.: url-1-1-1
            let isNotShowHide = !$li.parent().parent().hasClass("show-after") && !$li.parent().parent().hasClass("hide-after");
            $li.attr('id', checklistId); // Set the checklist id
            
            // Wrap text inside <li> with <label>
            if ($li.find('ol, ul').length !== 0) {
                $li.contents().not("ul, ol").wrapAll($label);
            } else if(isNotShowHide) {
                $li.wrapInner($label);
            }

            // If no parent li with class show-after or hide-after
            if (isNotShowHide) {
                $li.prepend($input); // Prepend input checkbox on <li>
            }
            
            // Check checkbox if it's saved in localStorage
            if (localStorage.getItem($li.attr('id')) === "true") {
                $li.children("input").prop("disabled", false).prop('checked', true);
                $li.children("label").addClass("selected");
                if ($li.closest(".checklist").hasClass("strikethrough")) {
                    $li.children("label").addClass("redacted");
                }
                showHideChecker($li, true, true);
            } else {
                showHideChecker($li, false, true);
            }
        }

        // If all sibling are checked then enabled the parent checkbox, else disabled it
        function checkSiblings() {
            var $checkbox = $(this);
            let isNotShowHide = !$checkbox.parent().parent().hasClass("show-after") && !$checkbox.parent().parent().hasClass("hide-after");

            if (isNotShowHide) {
                var $liSiblings = $checkbox.siblings("ul").children("li");
                var isAllLiSiblingsChecked = $liSiblings.children("input:checked").length === $liSiblings.children("input").length;
                if(isAllLiSiblingsChecked) {
                    $checkbox.prop("disabled", false);
                } else {
                    $checkbox.prop("disabled", true);
                }
            }
        }

        // Responds to change in each input checkbox and save it to local storage
        function checkboxChecker() {
            // Check for the checkbox parent and children
            var isCheckboxChecked = $(this).prop('checked');
            var $li = $(this).parent("li");
            var $parentListInput = $li.parent("ul, ol").siblings("input");
            var hasParentChecklist = $parentListInput.length;
            var $liSiblings = $li.siblings("li");
            var isAllLiSiblingsChecked = $liSiblings.children("input:checked").length === $liSiblings.children("input").length;

            if (isCheckboxChecked) {
                showHideChecker($li, true);
            } else {
                showHideChecker($li, false);
            }

            if (hasParentChecklist) {
                // If sublist is all checked/unchecked, check/uncheck the parent list
                if (isCheckboxChecked) {
                    if (isAllLiSiblingsChecked) {
                        $parentListInput.prop('disabled', false);
                    } else {
                        $parentListInput.prop('checked', false).trigger('change').prop('disabled', true);
                    }
                } else {
                    $parentListInput.prop('checked', false).trigger('change').prop('disabled', true);
                }
            }

            if (typeof (Storage) !== "undefined") { // local storage available
                var listId = $li.parent("ul, ol").attr("id"); // e.g.: url-1-(1)
                var liIndex = $li.index() + 1; // url-1-1-(1)
                var key = listId + "-" + liIndex; // e.g.: url-1-1-1
                var $inputLabel = $(this).siblings("label");

                if (isCheckboxChecked) {
                    localStorage.setItem(key, "true"); // Save to local storage
                    $inputLabel.addClass("selected");
                    if ($(this).closest(".checklist").hasClass("strikethrough")) {
                        $inputLabel.addClass("redacted");
                    }
                } else {
                    localStorage.removeItem(key); // Remove from local storage
                    $inputLabel.removeClass("selected");
                    if ($(this).closest(".checklist").hasClass("strikethrough")) {
                        $inputLabel.removeClass("redacted");
                    }
                }
            } else {
                alert("Sorry, your browser does not support Web Storage.");
            }
        }

        // If user click the label then it will trigger the input checkbox
        function handleLabel() {
            var $input = $(this).prev();
            $input.trigger("click");
        }
        
        // Check for optional hide-after and show-after function
        function showHideChecker($currentInput, isChecked, init = false) {
            var $list = $currentInput.children("ul, ol");
            if ($currentInput.hasClass("hide-after")) {
                if(isChecked && init) {
                    $list.hide();
                } else if (isChecked && !init) {
                    $list.animate({"opacity": "0"}, 100, function() {$(this).hide();});
                } else if (!isChecked && init) {
                    $list.show();
                } else {
                    $list.show().promise().done(function() {$(this).animate({"opacity": "1"}, 500);});
                }
            } else if ($currentInput.hasClass("show-after")) {
                if(isChecked && init) {
                    $list.show();
                } else if (isChecked && !init) {
                    $list.show().promise().done(function() {$(this).animate({"opacity": "1"}, 500);});
                } else if (!isChecked && init) {
                    $list.hide();
                } else {
                    $list.animate({"opacity": "0"}, 100, function() {$(this).hide();});
                }
            }
        }

    /* function addResetButton($checklist) {
            var $button = $("<button>").text("reset");
            $checklist.append($button);
            $button.click(resetChecklist);
        }

        // Remove all saved data in local storage
        function resetChecklist() {
            var li = "li[id*=" + pageName + "]";
            var idList = $(this).parent(".checklist").find(li).map(function() { return this.id; }).get();
            $(idList).each(function() {
                localStorage.removeItem(this);
                var id = "li#" + this;
                $(id).children("input[type=checkbox]").prop('checked', false).trigger("change");
                $(id).children("label").removeClass("selected");
            });
        } */
    }

}(jQuery));