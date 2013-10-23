function HarCtrl($scope) {
    $scope.files = [];

    $scope.addFile = function(f, e) {
        e.log.entriesSize = 0;
        for (var i = e.log.entries.length - 1; i >= 0; i--) {
            e.log.entriesSize += e.log.entries[i].response.bodySize;
        };
        $scope.files.push({file: f, data: e});
        $scope.$apply();
    };
}

function dragover(e) {
    e.stopPropagation();
    e.preventDefault();
    e.target.className = "hover";
}

function dragleave(e) {
    e.stopPropagation();
    e.preventDefault();
    e.target.className = "";
}

function fileHandler(e) {

    dragleave(e);
    var files = e.target.files || e.dataTransfer.files;

    for (var i = 0, f; f = files[i]; i++) {
        var r = new FileReader();
        r.onload = (function(f) {
            return function(ev){
                console.log(f, JSON.parse(ev.target.result));
                angular.element(e.target).scope().addFile(f, JSON.parse(ev.target.result));
            };
        })(f);
        r.readAsText(f);
    }
}

if (window.File && window.FileList && window.FileReader && new XMLHttpRequest().upload) {
    var inputfile = document.getElementById("inputfile"),
        dragzone = document.getElementById("dragzone");

    dragzone.addEventListener("dragover", dragover, false);
    dragzone.addEventListener("dragleave", dragleave, false);
    dragzone.addEventListener("drop", fileHandler, false);
    inputfile.addEventListener("change", fileHandler, false);
}
