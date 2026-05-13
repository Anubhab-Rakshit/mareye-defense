#![no_std]

use soroban_sdk::{symbol_short, Address, BytesN, Env, Vec, String};

pub struct MareyeContract;

impl MareyeContract {
    #[cfg_attr(target_family = "wasm", export_name = "initialize")]
    pub fn initialize(e: Env, authorized_agent: Address) {
        e.storage().instance().set(&symbol_short!("AUTH"), &authorized_agent);
        let empty_vec: Vec<String> = Vec::new(&e);
        e.storage().instance().set(&symbol_short!("DECS"), &empty_vec);
    }

    #[cfg_attr(target_family = "wasm", export_name = "log_ai_decision")]
    pub fn log_ai_decision(
        env: Env,
        threat_class: String,
        decision_matrix: String,
        _evidence_hash: BytesN<32>,
    ) {
        let authorized: Address = env.storage().instance().get(&symbol_short!("AUTH")).unwrap();
        let caller = authorized.clone();
        caller.require_auth();

        let mut decisions: Vec<String> = env.storage().instance().get(&symbol_short!("DECS")).unwrap();
        decisions.push_back(threat_class);
        decisions.push_back(decision_matrix);
        env.storage().instance().set(&symbol_short!("DECS"), &decisions);
    }

    #[cfg_attr(target_family = "wasm", export_name = "get_decisions")]
    pub fn get_decisions(env: Env) -> Vec<String> {
        env.storage().instance().get(&symbol_short!("DECS")).unwrap()
    }

    #[cfg_attr(target_family = "wasm", export_name = "get_decision_count")]
    pub fn get_decision_count(env: Env) -> u32 {
        let decisions: Vec<String> = env.storage().instance().get(&symbol_short!("DECS")).unwrap();
        decisions.len()
    }
}