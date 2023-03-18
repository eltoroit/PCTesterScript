class StaticClass {
	static method1() {
		console.log("In static method 1");
		// this.method2(); (Works, but not nice to see)
		StaticClass.method2();
	}
	static method2() {
		console.log("In static method 2");
	}
}

debugger;
console.log("Hello");
StaticClass.method1();
