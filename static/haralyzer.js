function HarCtrl($scope, $http) {
    var props = ['entriesLength', 'entriesSize', 'entriesReqHeadersSize', 'entriesResHeadersSize'];

    $scope.files = [];
    $scope.ranges = {};
    $scope.compare = {};
    $scope.compareWith = 'selected';


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
        $scope.ranges = {'worst': {}, 'best': {}};
        $scope.compare = {};
        angular.forEach($scope.selected(), function(file) {
            for (var i = props.length - 1; i >= 0; i--) {
                var val = file.data.log[props[i]];
                $scope.ranges.best[props[i]] = Math.min($scope.ranges.best[props[i]] || val, val);
                $scope.ranges.worst[props[i]] = Math.max($scope.ranges.worst[props[i]] || val, val);
            }
            if (file.unit) {
                for (var i = props.length - 1; i >= 0; i--) {
                    $scope.compare[props[i]] = file.data.log[props[i]];
                };
            }
        });
        if (!Object.keys($scope.compare).length) {
            if ($scope.compareWith == 'best' || $scope.compareWith == 'worst') {
                $scope.compare = $scope.ranges[$scope.compareWith];
            }
        }
        
        angular.forEach($scope.selected(), function(file) {
            file.data.perc = {};
            for (var i = props.length - 1; i >= 0; i--) {
                file.data.perc[props[i]] = (file.data.log[props[i]] / $scope.compare[props[i]] * 100 - 100);
            }
        });
    };

    $scope.$watch('files', $scope.recalcRanges, true);
    
    $scope.compareSet = function() {
        // $scope.deunit();
        if ($scope.highlighted().length) {
            $scope.compareWith = 'selected';
        }
        $scope.recalcRanges();
    };

    $scope.$watch('compareWith', $scope.compareSet, true);

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

    $scope.deunit = function() {
        angular.forEach($scope.files, function(file) {
            file.unit = false;
        });
    };

    $scope.unit = function(f) {
        angular.forEach($scope.selected(), function(file) {
            if (file != f) file.unit = false;
        });
        f.unit = !f.unit;
        $scope.compareWith = 'selected';
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

    $scope.highlighted = function() {
        var sel = [];
        angular.forEach($scope.files, function(file) {
            if (file.unit) sel.push(file);
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
        $http.get('giko.it.har').then(function(response) {
            $scope.addFile('giko.it.har', response.data);
        });
        $http.get('giko.it.gzip.har').then(function(response) {
            $scope.addFile('giko.it.gzip.har', response.data);
        });
        $http.get('giko.it.min.har').then(function(response) {
            $scope.addFile('giko.it.min.har', response.data);
        });
        $http.get('giko.it.gzip.min.har').then(function(response) {
            $scope.addFile('giko.it.gzip.min.har', response.data);
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
