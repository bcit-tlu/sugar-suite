(function () {
    $(".tabs").each(function (index) {
        let $tab = $(this);
        var tabHeading = $tab.children().first().prop("tagName");
        var tabTexts = [];
        var $tabNav = $("<ul class='tab-nav'>");
        $tab.css({ border: "none", padding: "initial" });
        $tab.children("h2, h3").not(":first-child").css("border-top", "initial");
        if (!$tab.hasClass("nav-top") && !$tab.hasClass("nav-bottom")) {
            $tab.css("flex-direction", "row");
        }
        let $tabColors = [];
        let $tabFontColors = [];
        $tab.children(tabHeading).each(function () {
            let $tabTitle = $(this);
            $tabColors.push($tabTitle.data('color'));
            $tabFontColors.push($tabTitle.data('font-color'));
            $tabTitle.addClass("tab-title");
            let nextString = trimWhiteSpace($tabTitle.next().text());
            let regex = /^(tabs*\s*\-?\s*texts?\s*:\s*)(.{1,})$/i;
            let tabText = nextString.match(regex);
            if (tabText && tabText[2]) {
                tabTexts.push(tabText[2]);
                $tabTitle.next().remove();
            } else {
                tabTexts.push(trimWhiteSpace($tabTitle.text()));
            }

            $tabTitle.nextUntil(tabHeading).addBack().wrapAll("<div class='tab-content'></div>");
        });

        $tab.wrapInner("<div class='tab-body'></div>");

        tabTexts.forEach(function (tabText, index) {
            let $tabLi = $("<li>");
            let $tabButton = $("<button>").text(tabText);
            let tabColor = $tabColors[index];
            if (tabColor) {
                $tabLi.css({ borderColor: tabColor });
                $tabButton.css({ backgroundColor: tabColor });
            }
            let tabFontColor = $tabFontColors[index];
            if (tabFontColor) {
                $tabButton.css({ color: tabFontColor });
            }
            $tabLi.append($tabButton);
            $tabNav.append($tabLi);
        });

        $tab.prepend($tabNav);
        var $tabBody = $tab.children(".tab-body");
        var $tabContents = $tabBody.children(".tab-content");

        $tabContents.first().addClass("active");
        $tabContents.not(".active").hide();
        $tabNav.children("li:first").addClass("selected");


        $tabNav.children("li").on("click", function (e) {
            e.preventDefault();
            let idx = $(this).index();
            $(this).siblings(".selected").removeClass("selected");
            $(this).addClass("selected");
            $tabContents.filter(".active").hide().removeClass("active");
            $tabContents.eq(idx).show().addClass("active");

            var $selectedTab = $(this);
            var selectedTabIndex = $selectedTab.index();
            var selectedTabColor = $tabNav.children("li").eq(selectedTabIndex).css("border-bottom-color");
            $tabNav.css("border-bottom-color", selectedTabColor);
            $tabBody.css("border-color", selectedTabColor);
        });
        $tabBody.css("border-color", $tabNav.children("li.selected").css("border-color"));
    });

    $(window).on("load resize", function () {
        $(".tabs").each(function (index) {
            let $tab = $(this);
            let $tabBody = $tab.children(".tab-body");
            let $tabContents = $tab.find(".tab-content");
            $tabBody.css('min-height', '0');

            let heights = $tabContents.map(function () {
                return $(this).outerHeight();
            }).get();

            let maxHeight = Math.max(...heights);
            let borderTop = parseFloat($tabBody.css("border-top-width"));
            let borderBottom = parseFloat($tabBody.css("border-bottom-width"));
            let totalBorderWidth = borderTop + borderBottom;
            $tabBody.animate({ 'min-height': maxHeight + totalBorderWidth }, 500);
        });
    });

    function trimWhiteSpace(str) {
        let text = (str ?? "").trim();
        text = text.replace(/\s+/g, " ");
        return text;
    }
})();
