document.addEventListener("DOMContentLoaded", function () {
  const canvas = new fabric.Canvas('canvas');
  canvas.setWidth(500);
  canvas.setHeight(600);

  fabric.Image.fromURL('images/61ogc05nK3L._AC_UY1000_.jpg', function (bgImg) {
      canvas.setBackgroundImage(bgImg, canvas.renderAll.bind(canvas), {
          originX: 'left',
          originY: 'top',
          scaleX: canvas.width / bgImg.width,
          scaleY: canvas.height / bgImg.height,
      });
  }, { crossOrigin: 'Anonymous' });

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('upload-image');

// Make the drop zone clickable so that it triggers the file input dialog.


  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());
  document.getElementById('remove-design').addEventListener('click', function () {
    if (currentImage) {
        canvas.remove(currentImage);
        currentImage = null;
        // Show the dropzone again so user can upload a new file
        dropzone.style.display = 'block';
        // Hide the remove button
        this.style.display = 'none';
    }
});


  dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.backgroundColor = "rgba(255,255,255,0.9)";
  });

  dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.style.backgroundColor = "rgba(255,255,255,0.8)";
  });
  dropzone.addEventListener('click', () => {
    fileInput.click();
    });

  const printArea = {
      left: 100,
      top: 100,
      width: 300,
      height: 400,
  };

  function constrainImage(img) {
      img.on('moving', function () {
          img.left = Math.max(printArea.left, Math.min(img.left, printArea.left + printArea.width - img.getScaledWidth()));
          img.top = Math.max(printArea.top, Math.min(img.top, printArea.top + printArea.height - img.getScaledHeight()));
          canvas.renderAll();
      });

      img.on('scaling', function () {
          const newWidth = img.getScaledWidth();
          const newHeight = img.getScaledHeight();

          if (newWidth > printArea.width || newHeight > printArea.height) {
              const scaleX = Math.min(printArea.width / img.width, 1);
              const scaleY = Math.min(printArea.height / img.height, 1);
              img.scaleX = scaleX;
              img.scaleY = scaleY;
          }

          img.left = Math.max(printArea.left, Math.min(img.left, printArea.left + printArea.width - img.getScaledWidth()));
          img.top = Math.max(printArea.top, Math.min(img.top, printArea.top + printArea.height - img.getScaledHeight()));
          canvas.renderAll();
      });
  }
  // Helper function to handle file reading and image creation
  function handleFile(file) {
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            fabric.Image.fromURL(event.target.result, function (img) {
                img.set({
                    left: printArea.left + printArea.width / 4,
                    top: printArea.top + printArea.height / 4,
                    scaleX: 0.5,
                    scaleY: 0.5,
                });
                canvas.add(img);
                constrainImage(img);
                canvas.renderAll();
                
                // Store the added image so you can remove it later
                currentImage = img;
                // Hide the dropzone
                dropzone.style.display = 'none';
                // Show the remove button
                document.getElementById('remove-design').style.display = 'inline-block';
            });
        };
        reader.readAsDataURL(file);
    }
}


dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFile(file);
});

  // Handle file input selection
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    handleFile(file);
});

 

  document.querySelector('.colors').addEventListener('click', function(event){
      if (event.target.classList.contains('color-option')) {
          const color = event.target.dataset.color;
          console.log("color selected:", color);
      }
  });

  document.querySelector('#size-form').addEventListener('click', function(event){
      if (event.target.classList.contains('size-option')) {
          const size = event.target.dataset.size;
          console.log("size selected:", size);
      }
  });
  let currentView = 'front';

  function changeShirtView(view) {
      currentView = view;
      changeShirtColor(selectedColor); // Use the global selectedColor
  }

  function changeShirtColor(color) {
      let imgSrc;
      switch (currentView) {
          case 'front':
              switch (color) {
                  case 'white':
                      imgSrc = 'images/white-shirt-front.avif';
                      break;
                  case 'laurier-purple':
                      imgSrc = 'images/61htRzcrRsS._AC_SX679_.jpg';
                      break;
                  case 'goose-grey':
                      imgSrc = 'images/goose-grey-front.jpg';
                      break;
                  case 'golden-hawk-gold':
                      imgSrc = 'images/golden-hawk-gold.avif';
                      break;
                  default:
                      imgSrc = 'images/61htRzcrRsS._AC_SX679_.jpg';
              }
              break;
          case 'back':
              switch (color) {
                  case 'white':
                      imgSrc = 'images/white-shirt-back.webp';
                      break;
                  case 'laurier-purple':
                      imgSrc = 'images/front-purple-shirt.jpg';
                      break;
                  case 'goose-grey':
                      imgSrc = 'images/goose-grey-back.jfif';
                      break;
                  case 'golden-hawk-gold':
                      imgSrc = 'images/golden-hawk-gold-back.avif';
                      break;
                  default:
                      imgSrc = 'images/front-purple-shirt.jpg';
              }
              break;
          default:
              imgSrc = 'images/61htRzcrRsS._AC_SX679_.jpg';
      }
      fabric.Image.fromURL(imgSrc, function (bgImg) {
          canvas.setBackgroundImage(bgImg, canvas.renderAll.bind(canvas), {
              originX: 'left',
              originY: 'top',
              scaleX: canvas.width / bgImg.width,
              scaleY: canvas.height / bgImg.height,
          });
      }, {
          crossOrigin: 'Anonymous',
          onerror: function (message) {
              console.error('Error loading image:', message);
          }
      });
  }

  // Event listeners using querySelectorAll
  document.querySelectorAll('.colors .color-option').forEach(button => {
      button.addEventListener('click', () => {
          document.querySelectorAll('.colors .color-option').forEach(btn => btn.classList.remove('selected'));
          button.classList.add('selected');
          selectedColor = button.dataset.color; // Update global variable
          changeShirtColor(selectedColor);
      });
  });

  document.querySelectorAll('.view-selection .view-option').forEach(button => {
      button.addEventListener('click', () => {
          changeShirtView(button.dataset.view);
      });
  });
  document.addEventListener("DOMContentLoaded", function () {
    // Declare currentImage so it can be accessed globally within this function
    let currentImage = null;
    
    const canvas = new fabric.Canvas('canvas');
    canvas.setWidth(500);
    canvas.setHeight(600);
  
    // ... your background image setup ...
  
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('upload-image');
    const removeButton = document.getElementById('remove-design');
  
    // Set up the remove button listener
    removeButton.addEventListener('click', function () {
      if (currentImage) {
        canvas.remove(currentImage);
        currentImage = null;
        // Show the dropzone again so user can upload a new file
        dropzone.style.display = 'block';
        // Hide the remove button
        this.style.display = 'none';
      }
    });
  

    function handleFile(file) {
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          fabric.Image.fromURL(event.target.result, function (img) {
            img.set({
              left: printArea.left + printArea.width / 4,
              top: printArea.top + printArea.height / 4,
              scaleX: 0.5,
              scaleY: 0.5,
            });
            canvas.add(img);
            constrainImage(img);
            canvas.renderAll();
            
            // Store the added image so you can remove it later
            currentImage = img;
            // Hide the dropzone
            dropzone.style.display = 'none';
            // Show the remove button
            removeButton.style.display = 'inline-block';
          });
        };
        reader.readAsDataURL(file);
      }
    }
  
    
  });
  

    // Example: When a color button is clicked (ensure your color buttons have a data-color attribute)
    document.querySelectorAll('.colors .color-option').forEach(button => {
    button.addEventListener('click', () => {
        selectedColor = button.dataset.color;
        // (Optional) Update visual selection here...
    });
    });

    // Example: When a size button is clicked (ensure your size buttons have a data-size attribute)
    document.querySelectorAll('.size-option').forEach(button => {
    button.addEventListener('click', () => {
        selectedSize = button.dataset.size;
    });
    });

    // Example: When a view button is clicked (ensure your view buttons have a data-view attribute)
    document.querySelectorAll('.view-option').forEach(button => {
    button.addEventListener('click', () => {
        currentView = button.dataset.view;
    });
    });
    document.getElementById('download-design').addEventListener('click', function () {
        canvas.renderAll();
        const dataURL = canvas.toDataURL({ format: 'png', quality: 1.0 });
        const link = document.createElement('a');
      
        // Use the selected values to build the filename. If a value isn’t set, use a default.
        const fileName = `${selectedColor || 'Color'}-${selectedSize || 'Size'}-${currentView || 'front'}-design.png`;
        
        link.href = dataURL;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
      
    // for view selection, ie, front and back of a product
    document.querySelectorAll('.view-selection button').forEach(button => {
        button.addEventListener('click', () => {
            //remove selected class from all view buttons 
            document.querySelectorAll('.view-selection button').forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
                currentView = button.dataset.view;
        });
    });

    //for size selection same thing 

    document.querySelectorAll('.size-selection button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.size-selection button').forEach(btn => btn.classList.remove('selected'));
            // add selected class to da clicked button
            button.classList.add('selected');
            selectedSize = button.dataset.size;
        });
    });

  
  
  
  
});