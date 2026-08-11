"""remove_whatsapp_and_twilio

Revision ID: 9b585eca9bf4
Revises: 57d8b3cc0adf
Create Date: 2026-08-10 23:10:46.956487

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b585eca9bf4'
down_revision: Union[str, None] = '57d8b3cc0adf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop WhatsApp/Twilio tables if they exist
    try:
        op.drop_index('ix_whatsapp_sessions_id', table_name='whatsapp_sessions', if_exists=True)
    except Exception:
        pass

    for table_name in ['whatsapp_sessions', 'bot_state', 'user_bot_sessions']:
        try:
            op.drop_table(table_name)
        except Exception:
            pass


    # 2. Safely alter users table (supports SQLite via batch mode)
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_users_telegram_chat_id', ['telegram_chat_id'])
        batch_op.drop_column('whatsapp_number')



def downgrade() -> None:
    # 1. Re-add column and drop constraint on users table
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('whatsapp_number', sa.VARCHAR(length=20), nullable=True))
        batch_op.drop_constraint('uq_users_telegram_chat_id', type_='unique')

    # 2. Re-create tables
    op.create_table('user_bot_sessions',
    sa.Column('user_id', sa.INTEGER(), nullable=False),
    sa.Column('phone_number', sa.VARCHAR(length=20), nullable=True),
    sa.Column('creds_data', sa.TEXT(), nullable=True),
    sa.Column('keys_data', sa.TEXT(), nullable=True),
    sa.Column('pairing_code', sa.VARCHAR(length=20), nullable=True),
    sa.Column('pairing_expires', sa.DATETIME(), nullable=True),
    sa.Column('status', sa.VARCHAR(length=20), nullable=True),
    sa.Column('updated_at', sa.DATETIME(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('user_id')
    )
    op.create_table('bot_state',
    sa.Column('key', sa.VARCHAR(length=100), nullable=False),
    sa.Column('value', sa.TEXT(), nullable=True),
    sa.Column('updated_at', sa.DATETIME(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.PrimaryKeyConstraint('key')
    )
    op.create_table('whatsapp_sessions',
    sa.Column('id', sa.VARCHAR(length=100), nullable=False),
    sa.Column('data', sa.TEXT(), nullable=False),
    sa.Column('updated_at', sa.DATETIME(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_whatsapp_sessions_id', 'whatsapp_sessions', ['id'], unique=False)

