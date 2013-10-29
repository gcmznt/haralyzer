function HarCtrl($scope, $http) {
    var props = ['entriesLength', 'entriesSize', 'entriesReqHeadersSize', 'entriesResHeadersSize'];

    $scope.files = [];
    $scope.ranges = {};
    $scope.compare = {};


    $scope.safeApply = function(fn) {
        var phase = this.$root.$$phase;
        if(phase == '$apply' || phase == '$digest') {
            if(fn && (typeof(fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };

    $scope.recalcRanges = function() {
        $scope.ranges = {'max': {}, 'min': {}};
        $scope.compare = {};
        angular.forEach($scope.selected(), function(file) {
            for (var i = props.length - 1; i >= 0; i--) {
                var val = file.data.log[props[i]];
                $scope.ranges.min[props[i]] = Math.min($scope.ranges.min[props[i]] || val, val);
                $scope.ranges.max[props[i]] = Math.max($scope.ranges.max[props[i]] || val, val);
            }
            if (file.unit) {
                for (var i = props.length - 1; i >= 0; i--) {
                    $scope.compare[props[i]] = file.data.log[props[i]];
                };
            }
        });
        if (!Object.keys($scope.compare).length) $scope.compare = $scope.ranges.min;
        
        angular.forEach($scope.selected(), function(file) {
            file.data.perc = {};
            for (var i = props.length - 1; i >= 0; i--) {
                file.data.perc[props[i]] = (file.data.log[props[i]] / $scope.compare[props[i]] * 100 - 100);
            }
        });
    };

    $scope.$watch('files', $scope.recalcRanges, true);

    $scope.addFile = function(f, e) {
        $scope.safeApply(function(){
            e.log.entriesLength = e.log.entries.length;
            e.log.entriesSize = 0;
            e.log.entriesReqHeadersSize = 0;
            e.log.entriesResHeadersSize = 0;
            e.log.respCodes = [];
            for (var i = e.log.entries.length - 1; i >= 0; i--) {
                e.log.entriesSize += e.log.entries[i].response.bodySize;
                e.log.entriesReqHeadersSize += e.log.entries[i].request.headersSize;
                e.log.entriesResHeadersSize += e.log.entries[i].response.headersSize;
                e.log.respCodes[e.log.entries[i].response.status] += 1;
            }
            // console.log(f, e);
            $scope.files.push({file: f, data: e, check: true, unit: false});
        });
    };

    $scope.unit = function(f) {
        angular.forEach($scope.selected(), function(file) {
            if (file != f) file.unit = false;
        });
        f.unit = !f.unit;
    };

    $scope.removeSelected = function() {
        var oldFiles = $scope.files;
        $scope.files = [];
        angular.forEach(oldFiles, function(file) {
            if (!file.check) $scope.files.push(file);
        });
    };

    $scope.selected = function() {
        var sel = [];
        angular.forEach($scope.files, function(file) {
            if (file.check) sel.push(file);
        });
        return sel;
    };

    $scope.selectAll = function() {
        var st = ($scope.selected().length < $scope.files.length) ? true : false;
        angular.forEach($scope.files, function(file) {
            file.check = st;
        });
    };

    $scope.demo = function() {
        $http.get('giko.it-before-gzip.har').then(function(response) {
            $scope.addFile('giko.it-before-gzip.har', response.data);
        });
        $http.get('giko.it-after-gzip.har').then(function(response) {
            $scope.addFile('giko.it-after-gzip.har', response.data);
        });
        $http.get('giko.it-after-min.har').then(function(response) {
            $scope.addFile('giko.it-after-min.har', response.data);
        });
    };
}

function dragover(e) {
    e.stopPropagation();
    e.preventDefault();
}

function fileHandler(e) {
    dragover(e);
    var files = e.target.files || e.dataTransfer.files;

    for (var i = 0, f; f = files[i]; i++) {
        var r = new FileReader();
        r.onload = (function(f) {
            return function(ev){
                angular.element(document.getElementById("main-controller")).scope().addFile(f.name, JSON.parse(ev.target.result));
            };
        })(f);
        r.readAsText(f);
    }
}

if (window.File && window.FileList && window.FileReader && new XMLHttpRequest().upload) {
    var inputfile = document.getElementById("inputfile"),
        dragzone = document.getElementById("dragzone");

    dragzone.addEventListener("dragover", dragover, false);
    dragzone.addEventListener("dragleave", dragover, false);
    dragzone.addEventListener("drop", fileHandler, false);
    inputfile.addEventListener("change", fileHandler, false);
}
