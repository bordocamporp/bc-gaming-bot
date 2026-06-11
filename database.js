const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function saveUser(member) {
  try {
    console.log(`👤 Tentativo salvataggio: ${member.user.tag}`);

    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          guild_id: member.guild.id,
          discord_id: member.user.id,
          username: member.user.tag,
          joined_at: new Date().toISOString(),
        },
        {
          onConflict: 'guild_id,discord_id',
        }
      )
      .select();

    if (error) {
      console.error('❌ Errore Supabase:', error);
      return;
    }

    console.log('✅ Utente salvato correttamente');
    console.log(data);

  } catch (err) {
    console.error('❌ Errore database:', err);
  }
}

async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Connessione Supabase fallita:', error);
      return false;
    }

    console.log('✅ Connessione Supabase riuscita');
    return true;
  } catch (err) {
    console.error('❌ Errore connessione:', err);
    return false;
  }
}

module.exports = {
  supabase,
  saveUser,
  testConnection,
};