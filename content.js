chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("Message received in content script:", request);
    if (request.action === "startScreenshot") {
        let startX, startY, endX, endY;
        let isSelecting = false;
        let overlay = document.createElement('div');
        let selectionBox = document.createElement('div');

        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.cursor = 'crosshair';
        overlay.style.zIndex = '10000';

        selectionBox.style.position = 'fixed';
        selectionBox.style.border = '2px dashed #ffffff';
        selectionBox.style.backgroundColor = 'rgba(255,255,255,0.1)';
        selectionBox.style.zIndex = '10001';

        document.body.appendChild(overlay);
        document.body.appendChild(selectionBox);

        function startSelection(e) {
            isSelecting = true;
            startX = e.clientX;
            startY = e.clientY;
            selectionBox.style.left = startX + 'px';
            selectionBox.style.top = startY + 'px';
        }

        function endSelection(e) {
            if (!isSelecting) return;
            isSelecting = false;
            endX = e.clientX;
            endY = e.clientY;
            captureScreenshot();
        }

        function updateSelection(e) {
            if (!isSelecting) return;
            endX = e.clientX;
            endY = e.clientY;
            const width = Math.abs(endX - startX);
            const height = Math.abs(endY - startY);
            const left = Math.min(startX, endX);
            const top = Math.min(startY, endY);
            selectionBox.style.width = width + 'px';
            selectionBox.style.height = height + 'px';
            selectionBox.style.left = left + 'px';
            selectionBox.style.top = top + 'px';
        }

        overlay.addEventListener('mousedown', startSelection);
        overlay.addEventListener('mouseup', endSelection);
        overlay.addEventListener('mousemove', updateSelection);

        function captureScreenshot() {
            const width = Math.abs(endX - startX);
            const height = Math.abs(endY - startY);
            const x = Math.min(startX, endX);
            const y = Math.min(startY, endY);

            // Calculate the devicePixelRatio to ensure correct scaling
            const dpr = window.devicePixelRatio || 1;

            chrome.runtime.sendMessage({
                action: "captureArea",
                area: {
                    x: x * dpr,
                    y: y * dpr,
                    width: width * dpr,
                    height: height * dpr
                }
            });

            document.body.removeChild(overlay);
            document.body.removeChild(selectionBox);
        }

        sendResponse({status: "Screenshot started"});
        return true;  // Indicates that the response is sent asynchronously
    } else if (request.action === "processScreenshot") {
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        let img = new Image();

        img.onload = function() {
            canvas.width = request.area.width;
            canvas.height = request.area.height;
            ctx.drawImage(img, 
                request.area.x, request.area.y, request.area.width, request.area.height, 
                0, 0, request.area.width, request.area.height
            );
            let croppedDataUrl = canvas.toDataURL('image/png');
            let link = document.createElement('a');
            link.download = 'screenshot.png';
            link.href = croppedDataUrl;
            link.click();
        };

        img.src = request.dataUrl;
    } else if (request.action === "extractLinks") {
        let links = [];
        let allLinks = document.querySelectorAll('a[href]');
        allLinks.forEach(link => {
            links.push(link.href);
        });
        navigator.clipboard.writeText(links.join('\n'));
    }
});