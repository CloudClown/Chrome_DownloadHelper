/*=====================Extension API==========================*/
//info hash for media requests
/*
  {
    tabId:{
      url:{
        active:true/false,
	requests:{
	  requestId1:request1,
	  requestId2:request2,
	  ...
	}
      }
    }
  }
*/
//acitve tab and url check
var activeURL = null;
var activeTabId = null;

var mediaRequestsMap = {};
//media file extensions regex

var mediaFormats = [
    "mp2",
    "mpeg2",
    "rmvb",
    "mpg",
    "mpeg",
    "avi",
    "rm",
    "wmv",
    "mov",
    "flv",
    "mpg3",
    "mp4",
    "mpeg4",
    "mp3",
    "mpeg3",
];

var siteExceptions = {
    "youtube.com":{"keyword":"videoplayback","format":"flv"}
};

var patternPartial = {
    "prefix":"\.+\\.",
    "suffix":"[^A-Za-z]*"
};

var patterns = [];
for (var index = 0; index < mediaFormats.length ; index++) {
    patterns.push(new RegExp("("+patternPartial["prefix"]+mediaFormats[index]+")"+patternPartial["suffix"]));
}

//list updater
var listUpdater = function (tab) {
    
    var hasTab = false;
    var tabMeta = mediaRequestsMap[tab.id];
    
    if (tabMeta) {
	hasTab = true;
    }
    
    if (hasTab) {
	var num = 0;
	var iter;
	for (iter in tabMeta) {
	    //skip the requestNum entry and iter through requests
	    if(iter !== "requestNum") {
		var requests = tabMeta[iter].requests;
		for (i in requests) {
		    num++
		}
	    }
	}
	mediaRequestsMap[tab.id].requestNum = num;
    }
    
    //debugging
    console.log(JSON.stringify(mediaRequestsMap));
};

var updateMeta = function(tab,tabId) {
    if (tab.active) {
	activeURL = tab.url;
	//update url activision state
	//change the state of active url
	var tabKey;
	for (tabKey in mediaRequestsMap) {
	    var urlKey;
	    for (urlKey in mediaRequestsMap[tabKey]) {
		(mediaRequestsMap[tabKey])[urlKey].active = false;
	    }
	}
	if (mediaRequestsMap.hasOwnProperty(tabId.toString())
	    && mediaRequestsMap[tabId.toString()].hasOwnProperty(activeURL)) {
	    (mediaRequestsMap[tabId.toString()])[activeURL].active = true;
	}
    }
    else {
	if (mediaRequestsMap.hasOwnProperty(tabId.toString())
	    && mediaRequestsMap[tabId.toString()].hasOwnProperty(tab.url)) {
	    (mediaRequestsMap[tabId.toString()])[tab.url].active = false;
	} 
    }
};

window.onload = function() {
    
    var queryInfo = {
	"currentWindow":true
    };
    
    chrome.tabs.query(queryInfo, function(tabArray) {
	for(var arrayIndex = 0 ; arrayIndex < tabArray.length ; arrayIndex++) {
	    mediaRequestsMap[tabArray[arrayIndex].id] = {requestNum:0};
	    listUpdater(tabArray[arrayIndex]);
	}
    });
    
    //watch tab status
    //add tab into the map
    chrome.tabs.onCreated.addListener(function(tab) {
	mediaRequestsMap[tab.id] = {requestNum:0};
	listUpdater(tab);
	
	//debugging
	console.log("Created!");
	
    });
    
    //remove tab from the map if user closes the tab, no access to the media url
    chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
	delete mediaRequestsMap[tabId];
    });
    
    //issue:when url changes, the tabid changes as well,
    //changing the url === remove original tab and create a new tab.
    chrome.tabs.onActivated.addListener(function(activeInfo) {
	activeTabId = activeInfo.tabId;
	var tabID = activeInfo.tabId;
	chrome.tabs.get(tabID, function(tab) {
	    activeURL = tab.url;
	    updateMeta(tab,tabID);
	    listUpdater(tab);
	});
    });
    
    //update the active url info when the active tab completes updating
    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	
	//inspect url change
	var tabMeteData = mediaRequestsMap[tabId];
	var inspectedURL = null;
	var key;
	for(key in tabMeteData) {
	    if(key !== "requestNum") {
		inspectedURL = key;
		break;
	    }	   
	}
	//wipe out previous meta if the url changes
	if(changeInfo.hasOwnProperty("url") 
	   && changeInfo.url !== inspectedURL) {
	    delete tabMeteData[inspectedURL];
	}
	
	updateMeta(tab,tabId);
	listUpdater(tab);
	
	//debugging
	console.log("Updated!");
	
    });
    
    //media request mapping
    chrome.webRequest.onBeforeRequest.addListener(function(details) {
	//threshholds
	if (details.tabId === -1) return;//return if the request if not  related to a tab
	if (!mediaRequestsMap.hasOwnProperty(details.tabId)) return;//return if tab is no longer open
	
	var isMatched = false;
	var mediaPattern;
	for (var pIndex = 0 ; pIndex < patterns.length ; pIndex++) {
	    if(patterns[pIndex].test(details.url)) {
		isMatched = true;
		mediaPattern = patterns[pIndex];
		//console.log(mediaPattern);
		break;
	    }
	}
	
	//console.log(details.type);
	
	if(isMatched) {
	    //console.log("Inside webRequest:"+activeURL);
	    //console.log("Inside webRequest:"+details.tabId);
	    if(mediaRequestsMap.hasOwnProperty(details.tabId)) {
		//match tab with the tabId
		chrome.tabs.get(details.tabId, function(tab) {
		    targetTab = mediaRequestsMap[details.tabId];
		    if (!targetTab.hasOwnProperty(tab.url)) {
			targetTab[tab.url] = {};
		    }
		    //add request to the media meta
		    if (tab.url === activeURL) {
			//change url's activision state
			targetTab[tab.url].active = true;
		    }
		    else {
			targetTab[tab.url].active = false;
		    }
		    //add new request to the url meta
		    urlMeta = targetTab[tab.url];
		    if (!urlMeta.hasOwnProperty("requests")) {
			urlMeta.requests = {};
		    }
		    
		    var captureGroup = mediaPattern;
		    
		    //console.log(captureGroup);
		    //console.log(details.url);
		    
		    var mediaID = (captureGroup.exec(details.url))[1];
		    urlMeta.requests[mediaID] = details.url;
		    listUpdater(tab);
		});
	    }
	}
	return;
    },{urls: ["<all_urls>"]});
};

var metaToNotification = null;
//message passing bewtween popup and notification
chrome.extension.onConnect.addListener(function(port) {
    if (port.name === "popupToNotification") {
	port.onMessage.addListener(function(msg) {
	    
	    metaToNotification = msg;
	    
	    var notification = webkitNotifications.createHTMLNotification("notification.html");
	    notification.show();
	    
	});
    }
    
    if (port.name === "debug") {
	port.onMessage.addListener(function(msg) {
	    console.log("====Debug Message====");
	    console.log(msg);
	    console.log("=====================");
	});
    }
    
    
});

