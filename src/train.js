const dataset = 'assets/data/training/asl_alphabet_tensors'
const classes = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  /*'nothing', */
  //  "space",
  // "del",
];

function trainTestSplit(...datas) {
  const last = datas[datas.length - 1];
  let opts = {};
  if (!Array.isArray(last)) {
    opts = last;
    datas.pop();
  }
  const testSize = opts.test_size ?? opts.testSize ?? 0.2;
  const randSeed =
    opts.random_state ??
    opts.randomState ??
    Math.random() * Number.MAX_SAFE_INTEGER;

  const shuffled = datas.map((n) =>
    shuffle(n, null, randomGenerator(randSeed))
  );
  const output = [];
  shuffled.forEach((data) => {
    const train = data.slice(0, Math.floor((1 - testSize) * data.length));
    const test = data.slice(train.length);
    output.push(train, test);
  });
  return output;
}

function shuffle(items, seed = null, rand = null) {
  rand = rand ?? randomGenerator(seed);
  const copy = items.slice(0);
  for (let i = 0; i < copy.length; i++) {
    const idx1 = i == 0 ? 0 : Math.floor(rand() * copy.length);
    const idx2 = Math.floor(rand() * copy.length);
    const oldItem = copy[idx1];
    copy[idx1] = copy[idx2];
    copy[idx2] = oldItem;
  }
  return copy;
}

function randomGenerator(seed = null) {
  const finalSeed =
    (seed ?? Math.random() * Number.MAX_SAFE_INTEGER) ^ 0xafbfcfdf;
  let rand = sfc32(0x9e3779b9, 0x243f6a88, 0xb7e15162, finalSeed);
  // let rand = () => Math.random()
  for (var i = 0; i < 15; i++) {
    rand();
  }
  return rand;
}

// https://stackoverflow.com/a/47593316
function sfc32(a, b, c, d) {
  return function () {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    var t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

function shuffleTest() {
  const counts = classes.reduce((acc, item) => {
    acc[item] = 0;
    return acc;
  }, {});

  for (let i = 0; i < 1000000; i++) {
    const shuffled = shuffle(classes);
    const item = shuffled[0];
    counts[item] = (counts[item] || 0) + 1;
  }

  let max = null;
  classes.forEach((item) => {
    if (max == null || counts[item] > counts[max]) {
      max = item;
    }
  });

  const normalizedCounts = classes.reduce((acc, item) => {
    acc[item] = counts[item] / counts[max];
    return acc;
  }, {});

  const numSegments = 50;
  classes.forEach((item) => {
    console.log(
      `${item} -> ${Array.from({
        length: Math.floor(numSegments * normalizedCounts[item]),
      }).join("█")}`
    );
  });
}

async function loadTensors() {
  const np = new npyjsparser();
  const output = {};
  await Promise.all(
    classes.map(async (n) => {
      const result = await np.load(`${dataset}/${n}.npy`);
      const numItems = result.shape[0];
      const data = [];
      for (let i = 0; i < numItems; i++) {
        data.push(Array.from(result.data.slice(i * 63, (i + 1) * 63)));
      }
      output[n] = data;
    })
  );
  return output;
}

export async function train(outputEle, opts = {}) {
  console.time("model")
  const inputData = await loadTensors();
  console.log("inputData", inputData)
  const X = [];
  const Y = [];
  const numEpochs = opts.epochs ?? 15
  const oneHotClasses = classes.reduce((acc, item, i) => {
    acc[item] = Array.from({ length: classes.length }).fill(0);
    acc[item][i] = 1;
    return acc;
  }, {});

  Object.keys(inputData).forEach((cls) => {
    const clsData = inputData[cls];
    const yVal = oneHotClasses[cls];
    clsData.forEach((item) => {
      X.push(item);
      Y.push(yVal);
    });
  });
  const [X_train_1, X_test_1, y_train_1, y_test] = trainTestSplit(X, Y, {
    test_size: 0.1,
    random_state: 42,
  });
  const [X_train, X_val, y_train, y_val] = trainTestSplit(
    X_train_1,
    y_train_1,
    { test_size: 0.1, random_state: 42 }
  );

  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [63], units: 63, activation: "relu" }),
      tf.layers.dense({ units: 512, activation: "relu" }),
      tf.layers.dense({ units: 256, activation: "relu" }),
      tf.layers.dropout({ rate: 0.3 }),
      tf.layers.dense({ units: 128, activation: "relu" }),
      tf.layers.dense({ units: classes.length, activation: "softmax" }),
    ],
  });

  let epoch = 0;

  function onBatchEnd(batch, logs) {
    outputEle.innerHTML = `
			  Epoch: ${epoch} Batch: ${batch}
			  <br>
			  Loss: ${logs.loss.toFixed(3)}
			  <br>
			  Accuracy: ${logs.acc.toFixed(3)}
			  <br>
		  `;
  }

  function onEpochEnd() {
    epoch++;
  }

  // Compile the model with the defined optimizer and specify a loss function to use.
  model.compile({
    // Adam changes the learning rate over time which is useful.
    // optimizer: 'adam',
    optimizer: tf.train.adam(0.001),
    // Use the correct loss function. If 2 classes of data, must use binaryCrossentropy.
    // Else categoricalCrossentropy is used if more than 2 classes.
    loss: "categoricalCrossentropy",
    // As this is a classification problem you can record accuracy in the logs too!
    metrics: ["accuracy"],
  });
  const data = tf.tensor(X_train);
  await model.fit(data, tf.tensor(y_train), {
    epochs: numEpochs,
    batchSize: 128,
    verbose: 1,
    validationData: [tf.tensor(X_val), tf.tensor(y_val)],
    callbacks: { onBatchEnd, onEpochEnd },
  });
  console.timeEnd("model")
  return model
}

// Copied from - https://github.com/aplbrain/npyjs/blob/b8c517a95753114150ed10d19afb22b55960dfd4/index.js
class npyjsparser {
	constructor(opts) {
	  if (opts) {
		console.error(
		  [
			"No arguments accepted to npyjs constructor.",
			"For usage, go to https://github.com/jhuapl-boss/npyjs.",
		  ].join(" ")
		);
	  }
  
	  this.dtypes = {
		"<u1": {
		  name: "uint8",
		  size: 8,
		  arrayConstructor: Uint8Array,
		},
		"|u1": {
		  name: "uint8",
		  size: 8,
		  arrayConstructor: Uint8Array,
		},
		"<u2": {
		  name: "uint16",
		  size: 16,
		  arrayConstructor: Uint16Array,
		},
		"|i1": {
		  name: "int8",
		  size: 8,
		  arrayConstructor: Int8Array,
		},
		"<i2": {
		  name: "int16",
		  size: 16,
		  arrayConstructor: Int16Array,
		},
		"<u4": {
		  name: "uint32",
		  size: 32,
		  arrayConstructor: Int32Array,
		},
		"<i4": {
		  name: "int32",
		  size: 32,
		  arrayConstructor: Int32Array,
		},
		"<u8": {
		  name: "uint64",
		  size: 64,
		  arrayConstructor: BigUint64Array,
		},
		"<i8": {
		  name: "int64",
		  size: 64,
		  arrayConstructor: BigInt64Array,
		},
		"<f4": {
		  name: "float32",
		  size: 32,
		  arrayConstructor: Float32Array,
		},
		"<f8": {
		  name: "float64",
		  size: 64,
		  arrayConstructor: Float64Array,
		},
	  };
	}
  
	parse(arrayBufferContents) {
	  // const version = arrayBufferContents.slice(6, 8); // Uint8-encoded
	  const headerLength = new DataView(
		arrayBufferContents.slice(8, 10)
	  ).getUint8(0);
	  const offsetBytes = 10 + headerLength;
  
	  const hcontents = new TextDecoder("utf-8").decode(
		new Uint8Array(arrayBufferContents.slice(10, 10 + headerLength))
	  );
	  const header = JSON.parse(
		hcontents
		  .toLowerCase() // True -> true
		  .replace(/'/g, '"')
		  .replace("(", "[")
		  .replace(/,*\),*/g, "]")
	  );
	  const shape = header.shape;
	  const dtype = this.dtypes[header.descr];
	  const nums = new dtype["arrayConstructor"](
		arrayBufferContents,
		offsetBytes
	  );
	  return {
		dtype: dtype.name,
		data: nums,
		shape,
		fortranOrder: header.fortran_order,
	  };
	}
  
	async load(filename, callback, fetchArgs) {
	  /*
			Loads an array from a stream of bytes.
			*/
	  fetchArgs = fetchArgs || {};
	  const resp = await fetch(filename, { ...fetchArgs });
	  const arrayBuf = await resp.arrayBuffer();
	  const result = this.parse(arrayBuf);
	  if (callback) {
		return callback(result);
	  }
	  return result;
	}
  }