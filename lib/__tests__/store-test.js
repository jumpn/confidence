jest.disableAutomock();
const Confidence = require('../index');

// Declare internals

const internals = {};


// Test shortcuts

const tree = {
    // Fork
    key1: 'abc',                        // Value
    key2: {
        // Filter
        $filter: 'env',
        production: {
            // Fork
            deeper: {
                // Value
                $value: 'value'         // Value
            }
        },
        $default: {
            // Filter
            $filter: 'platform',
            ios: 1,                     // Value
            android: false,             // Value
            $default: 2                 // Value
        }

    },
    key3: {
        // Fork
        sub1: {
            $value: 0,
            $meta: 'something'
        },
        sub2: {
            // Filter
            $filter: 'xfactor',
            $id: 'x_factor',
            yes: ''                      // Value
        }
    },
    key4: [12, 13, { $filter: 'none', x: 10, $default: 14 }],
    key5: {},
    key6: {
        $filter: 'env',
        production: {
            animal: 'chicken',
            color: 'orange'
        },
        staging: {
            animal: 'cow'
        },
        $base: {
            color: 'red'
        }
    },
    key7: {
        $filter: 'env',
        production: [
          { animal: 'chicken' },
          { animal: 'dog' }
        ],
        staging: [
          { animal: 'cow' }
        ],
        $base: [
          { animal: 'cat' }
        ]
    },
    key8: {
        $filter: 'env',
        production: [
          { animal: 'chicken' },
          { animal: 'dog' }
        ],
        $base: { animal: 'cat' }
    },
    key9: {
        $filter: 'env',
        production: { animal: 'chicken' },
        $base: [{ animal: 'cat' }]
    },
    ab: {
        // Range
        $filter: 'random.1',
        $id: 'random_ab_test',
        $range: [
            { limit: 1, value: [1, 2] },
            { limit: 2, value: { $value: 2 } },
            { limit: 3, value: { a: 5 }, id: '3' },
            { limit: 10, value: 4 },
            { limit: 20, value: 5 }
        ],
        $default: 6
    },
    $meta: {
        something: 'else'
    }
};

describe('get()', () => {

    const store = new Confidence.Store();
    store.load(tree);

    const get = function (key, result, criteria, applied) {

        it('gets value for ' + key + (criteria ? ' with criteria ' + JSON.stringify(criteria) : ''), (done) => {

            const resultApplied = [];
            const value = store.get(key, criteria, applied ? resultApplied : null);

            expect(value).toEqual(result);
            if (applied) {
                expect(resultApplied).toEqual(applied);
            }
            done();
        });
    };

    get('/key1', 'abc');
    get('/key2', 2, null, [{ filter: 'env', valueId: '$default' }, { filter: 'platform', valueId: '$default' }]);
    get('/key2', 1, { platform: 'ios' }, [{ filter: 'env', valueId: '$default' }, { filter: 'platform', valueId: 'ios' }]);
    get('/key2', false, { platform: 'android' });
    get('/key2', 2, { platform: 'else' });
    get('/key2/deeper', 'value', { env: 'production' });
    get('/key2/deeper', undefined, { env: 'qa' });
    get('/key2/deeper', undefined);
    get('/key5', {});
    get('/key6', { animal: 'chicken', color: 'orange' }, { env: 'production' });
    get('/key6', { color: 'red', animal: 'cow' }, { env: 'staging' });
    get('/key7', [{ animal: 'cat' },{ animal: 'chicken' },{ animal: 'dog' }], { env: 'production' });
    get('/key7', [{ animal: 'cat' },{ animal: 'cow' }], { env: 'staging' });
    get('/key8', [{ animal: 'chicken' },{ animal: 'dog' }], { env: 'production' });
    get('/key9', { animal: 'chicken' }, { env: 'production' });
    get('/', { key1: 'abc', key2: 2, key3: { sub1: 0 }, key4: [12, 13, 14], key5: {}, ab: 6 });
    get('/', { key1: 'abc', key2: 2, key3: { sub1: 0, sub2: '' }, key4: [12, 13, 14], key5: {}, ab: 6 }, { xfactor: 'yes' });
    get('/ab', 2, { random: { 1: 2 } }, [{ filter: 'random.1', valueId: '[object]', filterId: 'random_ab_test' }]);
    get('/ab', { a: 5 }, { random: { 1: 3 } }, [{ filter: 'random.1', valueId: '3', filterId: 'random_ab_test' }]);
    get('/ab', 4, { random: { 1: 9 } });
    get('/ab', 4, { random: { 1: 10 } }, [{ filter: 'random.1', valueId: '4', filterId: 'random_ab_test' }]);
    get('/ab', 5, { random: { 1: 11 } });
    get('/ab', 5, { random: { 1: 19 } });
    get('/ab', 6, { random: { 1: 29 } });

    it('fails on invalid key', (done) => {

        const value = store.get('key');
        expect(value).toBeUndefined()
        done();
    });
});

describe('meta()', () => {

    it('returns root meta', (done) => {

        const store = new Confidence.Store();
        store.load(tree);
        expect(store.meta('/')).toEqual(tree.$meta);
        done();
    });

    it('returns nested meta', (done) => {

        const store = new Confidence.Store();
        store.load(tree);
        expect(store.meta('/key3/sub1')).toEqual('something');
        done();
    });

    it('returns undefined for missing meta', (done) => {

        const store = new Confidence.Store();
        store.load(tree);
        expect(store.meta('/key1')).toBeUndefined();
        done();
    });
});

describe('load()', () => {

    it('fails on invalid tree', (done) => {

        const store = new Confidence.Store();
        expect(() => {
            store.load({ $b: 3 });
        }).toThrow();

        done();
    });
});

describe('validate()', () => {

    it('fails on Error node', (done) => {

        const err = Confidence.Store.validate({ key: new Error() });
        expect(err.message).toEqual('Invalid node object type');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on empty filter', (done) => {

        const err = Confidence.Store.validate({ key: { $filter: '' } });
        expect(err.message).toEqual('Invalid empty filter value');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on non-string filter', (done) => {

        const err = Confidence.Store.validate({ key: { $filter: 3 } });
        expect(err.message).toEqual('Filter value must be a string');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on invalid filter', (done) => {

        const err = Confidence.Store.validate({ key: { $filter: '4$' } });
        expect(err.message).toEqual('Invalid filter value 4$');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on invalid default', (done) => {

        const err = Confidence.Store.validate({ key: { $default: { $b: 5 } } });
        expect(err.message).toEqual('Unknown $ directive $b');
        expect(err.path).toEqual('/key/$default');
        done();
    });

    it('fails on unknown directive', (done) => {

        const err = Confidence.Store.validate({ key: { $unknown: 'asd' } });
        expect(err.message).toEqual('Unknown $ directive $unknown');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on invalid child node', (done) => {

        const err = Confidence.Store.validate({ key: { sub: { $b: 5 } } });
        expect(err.message).toEqual('Unknown $ directive $b');
        expect(err.path).toEqual('/key/sub');
        done();
    });

    it('fails on invalid value node', (done) => {

        const err = Confidence.Store.validate({ key: { $value: { $b: 5 } } });
        expect(err.message).toEqual('Unknown $ directive $b');
        expect(err.path).toEqual('/key/$value');
        done();
    });

    it('fails on mix of value and other criteria', (done) => {

        const values = {
            $filter: 'a',
            $default: '1',
            $range: [{ limit: 10, value: 4 }],
            a: 1
        };
        const node = {
            key: {
                $value: 1
            }
        };

        const keys = Object.keys(values);

        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const value = values[key];

            node.key[key] = value;

            const err = Confidence.Store.validate(node);
            expect(err.message).toEqual('Value directive can only be used with meta or nothing');
            expect(err.path).toEqual('/key');

        }

        done();
    });

    it('fails on default value without a filter', (done) => {

        const err = Confidence.Store.validate({ key: { $default: 1 } });
        expect(err.message).toEqual('Default value without a filter');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on filter without any value', (done) => {

        const err = Confidence.Store.validate({ key: { $filter: '1' } });
        expect(err.message).toEqual('Filter without any values');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on filter with only default', (done) => {

        const err = Confidence.Store.validate({ key: { $filter: 'a', $default: 1 } });
        expect(err.message).toEqual('Filter with only a default');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on non-array range', (done) => {

        const err = Confidence.Store.validate({ key: { $filter: 'a', $range: {}, $default: 1 } });
        expect(err.message).toEqual('Range value must be an array');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on empty array range', (done) => {

        const err = Confidence.Store.validate({ key: { $filter: 'a', $range: [], $default: 1 } });
        expect(err.message).toEqual('Range must include at least one value');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on non-object range array element', (done) => {

        const err = Confidence.Store.validate({ key: { $filter: 'a', $range: [5], $default: 1 } });
        expect(err.message).toEqual('Invalid range entry type');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on range array element missing limit', (done) => {

        const err = Confidence.Store.validate({ key: { $filter: 'a', $range: [{}], $default: 1 } });
        expect(err.message).toEqual('Range entry missing limit');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on range array element with non-number limit', (done) => {

        const err = Confidence.Store.validate({ key: { $filter: 'a', $range: [{ limit: 'a' }], $default: 1 } });
        expect(err.message).toEqual('Range limit must be a number');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on out of order range array elements', (done) => {

        const err = Confidence.Store.validate({ key: { $filter: 'a', $range: [{ limit: 11, value: 2 }, { limit: 10, value: 6 }], $default: 1 } });
        expect(err.message).toEqual('Range entries not sorted in ascending order - 10 cannot come after 11');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on range array element missing value', (done) => {

        const err = Confidence.Store.validate({ key: { $filter: 'a', $range: [{ limit: 1 }], $default: 1 } });
        expect(err.message).toEqual('Range entry missing value');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on range array element with invalid value', (done) => {

        const err = Confidence.Store.validate({ key: { $filter: 'a', $range: [{ limit: 1, value: { $b: 5 } }], $default: 1 } });
        expect(err.message).toEqual('Unknown $ directive $b');
        expect(err.path).toEqual('/key/$range[1]');
        done();
    });

    it('fails on range without a filter', (done) => {

        const err = Confidence.Store.validate({ key: { $range: [{ limit: 1, value: 1 }] } });
        expect(err.message).toEqual('Range without a filter');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on range with non-ranged values', (done) => {

        const err = Confidence.Store.validate({ key: { $filter: 'a', $range: [{ limit: 1, value: 1 }], a: 1 } });
        expect(err.message).toEqual('Range with non-ranged values');
        expect(err.path).toEqual('/key');
        done();
    });

    it('fails on invalid id', (done) => {

        const err = Confidence.Store.validate({ key: 5, $id: 4 });
        expect(err.message).toEqual('Id value must be a non-empty string');
        expect(err.path).toEqual('/');
        done();
    });

    it('fails on empty id', (done) => {

        const err = Confidence.Store.validate({ key: 5, $id: null });
        expect(err.message).toEqual('Id value must be a non-empty string');
        expect(err.path).toEqual('/');
        done();
    });

    it('returns null with null as the node', (done) => {

        const err = Confidence.Store.validate(null);
        expect(err).toBeNull();
        done();
    });

    it('returns null with undefined as the node', (done) => {

        const err = Confidence.Store.validate(undefined);
        expect(err).toBeNull();
        done();
    });

    it('fails on node that is a Date object', (done) => {

        const err = Confidence.Store.validate(new Date());

        expect(err.message).toEqual('Invalid node object type');
        done();
    });
});

describe('_logApplied', () => {

    it('adds the filter to the list of applied filters if node or criteria is not defined ', (done) => {

        const applied = [];

        Confidence.Store._logApplied(applied, { filter: 'env', valueId: '$default' });
        expect(applied.length).toEqual(1);
        done();
    });
});

it('accepts a document object in the constructor', (done) => {

    const load = Confidence.Store.prototype.load;

    Confidence.Store.prototype.load = function (document) {

        expect(document).toEqual(tree);
        Confidence.Store.prototype.load = load;
        done();
    };

    new Confidence.Store(tree);

});

