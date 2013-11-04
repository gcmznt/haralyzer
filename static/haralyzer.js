function HarCtrl($scope, $http) {
    var props = [
        'entriesLength',
        'entriesReqHeadersSize',
        'entriesSize',
        'entriesResHeadersSize',
        'entriesResSize',
        'totalTime',
        'onloadTime'
    ];

    $scope.files = [];
    $scope.ranges = {};
    $scope.compare = {};
    $scope.compareWith = 'selected';
    $scope.viewtype = 'simple';


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
                var val = file.calc[props[i]];
                $scope.ranges.best[props[i]] = Math.min($scope.ranges.best[props[i]] || val, val);
                $scope.ranges.worst[props[i]] = Math.max($scope.ranges.worst[props[i]] || val, val);
            }
            if (file.unit) {
                for (i = props.length - 1; i >= 0; i--) {
                    $scope.compare[props[i]] = file.calc[props[i]];
                }
            }
        });
        if (!Object.keys($scope.compare).length) {
            if ($scope.compareWith == 'best' || $scope.compareWith == 'worst') {
                $scope.compare = $scope.ranges[$scope.compareWith];
            }
        }
        
        var prev;
        var order = ($scope.compareWith == 'next') ? 'reverse' : '';
        angular.forEach($scope.selected(order), function(file) {
            file.perc = {};
            for (var i = props.length - 1; i >= 0; i--) {
                var c = (($scope.compareWith == 'previous' || $scope.compareWith == 'next') && prev) ? prev.calc[props[i]] : $scope.compare[props[i]];
                file.perc[props[i]] = (file.calc[props[i]] / c * 100 - 100);
                // console.log(c, file);
            }
            prev = file;
        });
    };

    $scope.$watch('files', $scope.recalcRanges, true);
    
    $scope.compareSet = function() {
        if ($scope.compareWith != 'selected') {
            $scope.deunit();
        }
        $scope.recalcRanges();
    };

    $scope.$watch('compareWith', $scope.compareSet, true);

    $scope.addFile = function(f, e) {
        var calc = {};
        var t;
        $scope.safeApply(function(){
            calc.entriesLength = e.log.entries.length;
            calc.onloadTime = e.log.pages[0].pageTimings.onLoad;
            calc.entriesSize = 0;
            calc.entriesReqHeadersSize = 0;
            calc.entriesResHeadersSize = 0;
            calc.entriesResSize = 0;
            calc.totalTime = 0;
            calc.timingsPerc = {};
            calc.timings = {};
            calc.respCodes = [];
            for (var i = e.log.entries.length - 1; i >= 0; i--) {
                calc.totalTime += e.log.entries[i].time;

                for (var key in e.log.entries[i].timings) {
                    calc.timings[key] = (calc.timings[key]) ? calc.timings[key] : 0;
                    calc.timings[key] += (e.log.entries[i].timings[key] != -1) ? e.log.entries[i].timings[key] : 0;
                }

                calc.entriesSize += e.log.entries[i].response.bodySize;
                calc.entriesReqHeadersSize += e.log.entries[i].request.headersSize;
                calc.entriesResHeadersSize += e.log.entries[i].response.headersSize;
                calc.entriesResSize += e.log.entries[i].response.headersSize + e.log.entries[i].response.bodySize;
                if (!calc.respCodes[e.log.entries[i].response.status])
                    calc.respCodes[e.log.entries[i].response.status] = 0;
                calc.respCodes[e.log.entries[i].response.status] += 1;
            }

            for (var key in calc.timings) {
                calc.timingsPerc[key] = calc.timings[key] / calc.totalTime * 100;
            }
            console.log({
                name: f,
                log: e.log,
                calc: calc,
                check: true,
                unit: false
            });
            $scope.files.push({
                name: f,
                log: e.log,
                calc: calc,
                check: true,
                unit: false
            });
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

    $scope.remove = function(f) {
        var oldFiles = $scope.files;
        $scope.files = [];
        angular.forEach(oldFiles, function(file) {
            if (file != f) $scope.files.push(file);
        });
    };

    $scope.selected = function(order) {
        var sel = [];
        angular.forEach($scope.files, function(file) {
            if (file.check) sel.push(file);
        });
        var sel = sel.sort(function(a, b){
            a = new Date(a.log.pages[0].startedDateTime);
            b = new Date(b.log.pages[0].startedDateTime);
            return (a < b) ? -1 : (a > b) ? 1 : 0;
        });
        return (order && order == 'reverse') ? sel.reverse() : sel;
    };

    $scope.hidden = function(order) {
        var sel = [];
        angular.forEach($scope.files, function(file) {
            if (!file.check) sel.push(file);
        });
        var sel = sel.sort(function(a, b){
            a = new Date(a.log.pages[0].startedDateTime);
            b = new Date(b.log.pages[0].startedDateTime);
            return (a < b) ? -1 : (a > b) ? 1 : 0;
        });
        return (order && order == 'reverse') ? sel.reverse() : sel;
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
        $http.get('giko.it.firefox.har').then(function(response) {
            $scope.addFile('giko.it.firefox.har', response.data);
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
