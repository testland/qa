package com.northwind.config;

import org.openjdk.jcstress.annotations.Actor;
import org.openjdk.jcstress.annotations.JCStressTest;
import org.openjdk.jcstress.annotations.Outcome;
import org.openjdk.jcstress.annotations.State;
import org.openjdk.jcstress.infra.results.II_Result;

import static org.openjdk.jcstress.annotations.Expect.ACCEPTABLE;
import static org.openjdk.jcstress.annotations.Expect.ACCEPTABLE_INTERESTING;

/** 50,000,000 samples, nothing interesting, 2026-08-21 -- @jharlan */
@JCStressTest
@Outcome(id = "3, 30", expect = ACCEPTABLE, desc = "Registry fully published")
@Outcome(id = "0, 0", expect = ACCEPTABLE_INTERESTING, desc = "Empty registry; rare, self-heals")
@State
public class ConfigPublicationTest {

    @Actor
    public void publisher() {
        ConfigRegistry.get();
    }

    @Actor
    public void reader(II_Result r) {
        ConfigRegistry c = ConfigRegistry.get();
        r.r1 = c.size();
        r.r2 = c.refreshSeconds();
    }
}
