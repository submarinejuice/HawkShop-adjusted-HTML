// your-script.js
const canvas = new fabric.Canvas('canvas');


// handling user upload
fabric.Image.fromURL('path-to-your-shirt-image.png', function(img) {
    canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
      scaleX: canvas.width / img.width,
      scaleY: canvas.height / img.height,
      originX: 'left',
      originY: 'top'
    });
  });
  

document.getElementById('upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event){
        fabric.image.fromURL(event.target.result, function(img){
            img.set({
                left:100,
                top:100,
                scaleX: 0.5,
                scaleY: 0.5,

            });
            canvas.add(img);
            img.on('moving', function(){
                const printableArea = { x: 50, y:150, width:400, height:300};
                if (img.left < printableArea.x) img.left = printableArea.x;
                if (img.top < printableArea.y) img.top = printableArea.y;
                if (img.left + img.width * img.scaleX > printableArea.x + printableArea.width)
                    img.left = printableArea.x + printableArea.width - img.width * img.scaleX;
                if (img.top + img.height * img.scaleY > printableArea.y + printableArea.height)
                    img.top = printableArea.y + printableArea.height - img.height * img.scaleY;

            });
        });
    };
    reader.readAsDataURL(file);
});
document.getElementById('submit').addEventListener('click', function() {
    const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1.0
    });
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'custom-designing.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
document.getElementById('upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    console.log("File selected:", file);
    
    const reader = new FileReader();
    reader.onload = function(event) {
      console.log("File loaded:", event.target.result);
      fabric.Image.fromURL(event.target.result, function(img) {
        img.set({
          left: 100,
          top: 100,
          scaleX: 0.5,
          scaleY: 0.5,
        });
        canvas.add(img);
        canvas.renderAll();
        console.log("Image added to canvas");
      });
    };
    reader.readAsDataURL(file);
  });
  
  