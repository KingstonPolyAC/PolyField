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
	

}

