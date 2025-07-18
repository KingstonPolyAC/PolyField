export namespace main {
	
	export class AveragedEDMReading {
	    slopeDistanceMm: number;
	    vAzDecimal: number;
	    harDecimal: number;
	
	    static createFrom(source: any = {}) {
	        return new AveragedEDMReading(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.slopeDistanceMm = source["slopeDistanceMm"];
	        this.vAzDecimal = source["vAzDecimal"];
	        this.harDecimal = source["harDecimal"];
	    }
	}
	export class EdgeVerificationResult {
	    measuredRadius: number;
	    differenceMm: number;
	    isInTolerance: boolean;
	    toleranceAppliedMm: number;
	
	    static createFrom(source: any = {}) {
	        return new EdgeVerificationResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.measuredRadius = source["measuredRadius"];
	        this.differenceMm = source["differenceMm"];
	        this.isInTolerance = source["isInTolerance"];
	        this.toleranceAppliedMm = source["toleranceAppliedMm"];
	    }
	}
	export class EDMPoint {
	    x: number;
	    y: number;
	
	    static createFrom(source: any = {}) {
	        return new EDMPoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.x = source["x"];
	        this.y = source["y"];
	    }
	}
	export class EDMCalibrationData {
	    deviceId: string;
	    // Go type: time
	    timestamp: any;
	    selectedCircleType: string;
	    targetRadius: number;
	    stationCoordinates: EDMPoint;
	    isCentreSet: boolean;
	    edgeVerificationResult?: EdgeVerificationResult;
	
	    static createFrom(source: any = {}) {
	        return new EDMCalibrationData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.deviceId = source["deviceId"];
	        this.timestamp = this.convertValues(source["timestamp"], null);
	        this.selectedCircleType = source["selectedCircleType"];
	        this.targetRadius = source["targetRadius"];
	        this.stationCoordinates = this.convertValues(source["stationCoordinates"], EDMPoint);
	        this.isCentreSet = source["isCentreSet"];
	        this.edgeVerificationResult = this.convertValues(source["edgeVerificationResult"], EdgeVerificationResult);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	export class SessionStatistics {
	    totalThrows: number;
	    averageX: number;
	    averageY: number;
	    maxDistance: number;
	    minDistance: number;
	    averageDistance: number;
	    spreadRadius: number;
	
	    static createFrom(source: any = {}) {
	        return new SessionStatistics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalThrows = source["totalThrows"];
	        this.averageX = source["averageX"];
	        this.averageY = source["averageY"];
	        this.maxDistance = source["maxDistance"];
	        this.minDistance = source["minDistance"];
	        this.averageDistance = source["averageDistance"];
	        this.spreadRadius = source["spreadRadius"];
	    }
	}
	export class ThrowCoordinate {
	    x: number;
	    y: number;
	    distance: number;
	    circleType: string;
	    // Go type: time
	    timestamp: any;
	    athleteId: string;
	    competitionRound: string;
	    edmReading: string;
	
	    static createFrom(source: any = {}) {
	        return new ThrowCoordinate(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.x = source["x"];
	        this.y = source["y"];
	        this.distance = source["distance"];
	        this.circleType = source["circleType"];
	        this.timestamp = this.convertValues(source["timestamp"], null);
	        this.athleteId = source["athleteId"];
	        this.competitionRound = source["competitionRound"];
	        this.edmReading = source["edmReading"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ThrowSession {
	    sessionId: string;
	    circleType: string;
	    // Go type: time
	    startTime: any;
	    // Go type: time
	    endTime?: any;
	    coordinates: ThrowCoordinate[];
	    statistics?: SessionStatistics;
	
	    static createFrom(source: any = {}) {
	        return new ThrowSession(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sessionId = source["sessionId"];
	        this.circleType = source["circleType"];
	        this.startTime = this.convertValues(source["startTime"], null);
	        this.endTime = this.convertValues(source["endTime"], null);
	        this.coordinates = this.convertValues(source["coordinates"], ThrowCoordinate);
	        this.statistics = this.convertValues(source["statistics"], SessionStatistics);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

